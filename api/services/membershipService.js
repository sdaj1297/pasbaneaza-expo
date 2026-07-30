const { getApps, initializeApp } = require('firebase/app');
const {
  addDoc,
  collection,
  getFirestore,
  serverTimestamp,
} = require('firebase/firestore');

const FIREBASE_APP_NAME = 'membership-submissions';
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeMembershipInput(input) {
  const name = cleanText(input.name, 120);
  const email = cleanText(input.email, 160).toLowerCase();
  const phone = cleanText(input.phone, 40);
  const message = cleanText(input.message, 2000);

  if (!name && !email && !phone) {
    const error = new Error('At least one contact field is required.');
    error.status = 400;
    throw error;
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error('Enter a valid email address.');
    error.status = 400;
    throw error;
  }

  return { name, email, phone, message };
}

function getMembershipDb() {
  const existingApp = getApps().find((app) => app.name === FIREBASE_APP_NAME);
  const app = existingApp || initializeApp({
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  }, FIREBASE_APP_NAME);

  if (!app.options.projectId) {
    throw new Error('Firebase is not configured for membership submissions.');
  }

  return getFirestore(app);
}

async function sendEmail({ to, subject, text, html, idempotencyKey }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MEMBERSHIP_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error('Membership email delivery is not configured.');
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
      reply_to: process.env.MEMBERSHIP_REPLY_TO_EMAIL || undefined,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend rejected the email (${response.status}): ${detail}`);
  }
}

async function createMembershipSubmission(input) {
  const submission = normalizeMembershipInput(input);
  const db = getMembershipDb();
  const docRef = await addDoc(collection(db, 'submissions'), {
    type: 'membership',
    ...submission,
    payload: { interestType: 'membership' },
    source: 'website',
    status: 'new',
    createdAt: serverTimestamp(),
  });

  const adminRecipient = process.env.MEMBERSHIP_NOTIFICATION_EMAIL;
  const applicantLabel = submission.name || submission.email || submission.phone || 'New applicant';
  const detailsText = [
    `Name: ${submission.name || 'Not provided'}`,
    `Email: ${submission.email || 'Not provided'}`,
    `Phone: ${submission.phone || 'Not provided'}`,
    '',
    'Membership details:',
    submission.message || 'Not provided',
    '',
    `Submission ID: ${docRef.id}`,
  ].join('\n');
  const detailsHtml = `
    <h2>New Pasban-e-Aza membership request</h2>
    <p><strong>Name:</strong> ${escapeHtml(submission.name || 'Not provided')}</p>
    <p><strong>Email:</strong> ${escapeHtml(submission.email || 'Not provided')}</p>
    <p><strong>Phone:</strong> ${escapeHtml(submission.phone || 'Not provided')}</p>
    <p><strong>Membership details:</strong><br>${escapeHtml(submission.message || 'Not provided').replace(/\n/g, '<br>')}</p>
    <p style="color:#666">Submission ID: ${escapeHtml(docRef.id)}</p>
  `;

  const delivery = {
    notificationSent: false,
    confirmationSent: false,
  };

  const adminEmail = adminRecipient
    ? sendEmail({
        to: adminRecipient,
        subject: `New membership request: ${applicantLabel}`,
        text: detailsText,
        html: detailsHtml,
        idempotencyKey: `membership-admin-${docRef.id}`,
      }).then(() => {
        delivery.notificationSent = true;
      })
    : Promise.reject(new Error('MEMBERSHIP_NOTIFICATION_EMAIL is not configured.'));

  const confirmationEmail = submission.email
    ? sendEmail({
        to: submission.email,
        subject: 'We received your Pasban-e-Aza membership request',
        text: [
          `Salaam${submission.name ? ` ${submission.name}` : ''},`,
          '',
          'Thank you for your interest in becoming a member of Anjuman Pasban-e-Aza.',
          'Your information has been received, and a member of the Pasban team will follow up with you.',
          '',
          'Anjuman Pasban-e-Aza',
          'https://www.pasbaneaza.org',
        ].join('\n'),
        html: `
          <p>Salaam${submission.name ? ` ${escapeHtml(submission.name)}` : ''},</p>
          <p>Thank you for your interest in becoming a member of Anjuman Pasban-e-Aza.</p>
          <p>Your information has been received, and a member of the Pasban team will follow up with you.</p>
          <p>Anjuman Pasban-e-Aza<br><a href="https://www.pasbaneaza.org">www.pasbaneaza.org</a></p>
        `,
        idempotencyKey: `membership-confirmation-${docRef.id}`,
      }).then(() => {
        delivery.confirmationSent = true;
      })
    : Promise.resolve();

  const emailResults = await Promise.allSettled([adminEmail, confirmationEmail]);
  emailResults.forEach((result) => {
    if (result.status === 'rejected') {
      console.error('Membership email delivery failed.', result.reason);
    }
  });

  return {
    id: docRef.id,
    type: 'membership',
    status: 'new',
    ...delivery,
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  createMembershipSubmission,
  normalizeMembershipInput,
};
