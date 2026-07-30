const { getApps, initializeApp } = require('firebase/app');
const {
  addDoc,
  collection,
  getFirestore,
  serverTimestamp,
} = require('firebase/firestore');

const FIREBASE_APP_NAME = 'membership-submissions';
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const SITE_URL = 'https://www.pasbaneaza.org';
const WHATSAPP_ANNOUNCEMENTS_URL = 'https://chat.whatsapp.com/I0PxdtZt9x1Bg3QN9btF9M?s=cl&p=i&ilr=4&amv=0';

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
        subject: 'Your Pasban-e-Aza membership request was received',
        ...buildMembershipConfirmationEmail(submission),
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

function buildMembershipConfirmationEmail(submission) {
  const greeting = submission.name
    ? `Salaam ${submission.name},`
    : 'Salaam,';
  const escapedGreeting = escapeHtml(greeting);

  return {
    text: [
      greeting,
      '',
      'Thank you for your interest in becoming a member of Anjuman Pasban-e-Aza.',
      'We have received your information. A member of the Pasban team will review it and follow up with you.',
      '',
      'Join the Pasban announcements group on WhatsApp:',
      WHATSAPP_ANNOUNCEMENTS_URL,
      '',
      `View the community schedule: ${SITE_URL}`,
      '',
      'Anjuman Pasban-e-Aza',
      'Houston, Texas',
    ].join('\n'),
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <style>
      @media only screen and (max-width: 620px) {
        .email-shell { width: 100% !important; }
        .email-pad { padding-left: 24px !important; padding-right: 24px !important; }
        .brand-title { font-size: 21px !important; }
        .headline { font-size: 32px !important; line-height: 37px !important; }
        .cta { display: block !important; text-align: center !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#080706; color:#1b1714;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
      Your membership request has been received by Anjuman Pasban-e-Aza.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background-color:#080706;">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" class="email-shell" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px; max-width:600px; background-color:#f3eee4; border-collapse:collapse;">
            <tr>
              <td style="height:5px; background-color:#a61f31; font-size:0; line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td class="email-pad" style="padding:22px 38px; background-color:#100d0b; border-bottom:1px solid #332923;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td width="58" valign="middle" style="width:58px;">
                      <img src="${SITE_URL}/pasban-logo-email.png" width="48" height="48" alt="Pasban-e-Aza" style="display:block; width:48px; height:48px; object-fit:contain; border:0;">
                    </td>
                    <td valign="middle">
                      <div class="brand-title" style="font-family:Georgia, 'Times New Roman', serif; font-size:23px; line-height:27px; color:#f8f3e9; font-weight:bold;">Anjuman Pasban-e-Aza</div>
                      <div style="margin-top:3px; font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:16px; color:#c7a85a; letter-spacing:1.4px; text-transform:uppercase;">Houston</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-pad" style="padding:42px 44px 18px;">
                <div style="font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:16px; color:#971b2d; font-weight:bold; letter-spacing:1.5px; text-transform:uppercase;">Membership request received</div>
                <h1 class="headline" style="margin:10px 0 22px; font-family:Georgia, 'Times New Roman', serif; font-size:39px; line-height:44px; color:#171310; font-weight:normal;">${escapedGreeting}</h1>
                <p style="margin:0 0 14px; font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:27px; color:#4e4640;">
                  Thank you for your interest in becoming a member of Anjuman Pasban-e-Aza.
                </p>
                <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:27px; color:#4e4640;">
                  We have received your information. A member of the Pasban team will review it and follow up with you.
                </p>
              </td>
            </tr>
            <tr>
              <td class="email-pad" style="padding:18px 44px 6px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td width="4" style="width:4px; background-color:#c3a251;">&nbsp;</td>
                    <td style="padding:14px 18px; background-color:#e9e1d3;">
                      <div style="font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:17px; color:#8f1d2e; font-weight:bold; letter-spacing:1px; text-transform:uppercase;">What happens next</div>
                      <div style="margin-top:4px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:23px; color:#514840;">No further action is required. The Pasban team will contact you using the information you provided.</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-pad" style="padding:28px 44px 42px;">
                <p style="margin:0 0 14px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:22px; color:#675e56;">In the meantime, join the announcements group for community updates and program reminders.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td bgcolor="#971b2d" style="border-radius:4px;">
                      <a class="cta" href="${WHATSAPP_ANNOUNCEMENTS_URL}" target="_blank" style="display:inline-block; padding:14px 22px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:20px; color:#ffffff; font-weight:bold; text-decoration:none;">Join announcements on WhatsApp</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:22px 0 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:20px; color:#756b63;">
                  Or visit <a href="${SITE_URL}" style="color:#8f1d2e; font-weight:bold; text-decoration:underline;">pasbaneaza.org</a> to view the community schedule.
                </p>
              </td>
            </tr>
            <tr>
              <td class="email-pad" style="padding:22px 44px; background-color:#100d0b; border-top:1px solid #332923;">
                <div style="font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:19px; color:#b8ada4;">Anjuman Pasban-e-Aza &middot; Houston, Texas</div>
                <div style="margin-top:4px; font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:17px; color:#7f746c;">You received this email because a membership request was submitted using this address.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
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
  buildMembershipConfirmationEmail,
  createMembershipSubmission,
  normalizeMembershipInput,
};
