const { pool } = require('../db');
const { cleanText } = require('../utils/text');

const allowedSubmissionTypes = new Set(['contact', 'reminder', 'membership', 'volunteer']);

function normalizeSubmissionInput(input) {
  const type = cleanText(input.type).toLowerCase();
  if (!allowedSubmissionTypes.has(type)) {
    const error = new Error('Invalid submission type.');
    error.status = 400;
    throw error;
  }

  const name = cleanText(input.name).slice(0, 120);
  const email = cleanText(input.email).slice(0, 160);
  const phone = cleanText(input.phone).slice(0, 40);
  const message = cleanText(input.message).slice(0, 2000);

  if (!name && !email && !phone) {
    const error = new Error('At least one contact field is required.');
    error.status = 400;
    throw error;
  }

  return {
    type,
    name: name || null,
    email: email || null,
    phone: phone || null,
    message: message || null,
    payloadJson: JSON.stringify(input.payload || {}),
    source: cleanText(input.source || 'website').slice(0, 64) || 'website',
  };
}

async function createSubmission(input, db = pool) {
  const submission = normalizeSubmissionInput(input);
  const [result] = await db.query(
    `insert into app_form_submissions
       (submission_type, name, email, phone, message, payload_json, source)
     values
       (:type, :name, :email, :phone, :message, :payloadJson, :source)`,
    submission,
  );

  return {
    id: String(result.insertId),
    type: submission.type,
    status: 'new',
  };
}

module.exports = {
  allowedSubmissionTypes,
  createSubmission,
  normalizeSubmissionInput,
};
