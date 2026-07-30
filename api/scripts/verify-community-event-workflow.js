const assert = require('assert');

const {
  buildCommunityEventPayload,
  normalizeCommunityEventInput,
} = require('../services/communityEventService');
const { getHoustonDate } = require('../utils/dates');
const { getStatusUpdatesOpenAt } = require('../utils/statusUpdateWindow');

function addDays(value, days) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function expectValidationError(input, message) {
  assert.throws(
    () => normalizeCommunityEventInput(input),
    (error) => error.status === 400 && error.message.includes(message),
  );
}

const validInput = {
  name: 'Community Host',
  email: 'host@example.com',
  phone: '713-555-1212',
  message: 'Speaker details to follow.',
  payload: {
    eventTitle: 'Community Majlis',
    eventDate: addDays(getHoustonDate(), 30),
    eventTime: '7:00 PM',
    eventAddress: 'Houston, TX',
    eventAudience: 'Family',
    requestsAnjuman: true,
  },
};

const normalized = normalizeCommunityEventInput(validInput);
assert.equal(normalized.event.type, 'F');
assert.equal(normalized.event.requestsAnjuman, true);
assert.equal(normalized.contact.email, 'host@example.com');
const publicEvent = buildCommunityEventPayload(normalized, 'community-test', 'timestamp');
assert.equal(publicEvent.isPublished, true);
assert.equal(publicEvent.isPlaceholder, false);
assert.equal(publicEvent.isAnjumanSchedule, false);
assert.equal(publicEvent.anjumanApprovalStatus, 'pending');
assert.equal(Object.hasOwn(publicEvent, 'email'), false);
assert.equal(Object.hasOwn(publicEvent, 'phone'), false);
assert.equal(
  getStatusUpdatesOpenAt('2026-07-30', '7:00 PM').toISOString(),
  '2026-07-30T23:30:00.000Z',
);
assert.equal(
  getStatusUpdatesOpenAt('2026-12-12', '2:30 PM').toISOString(),
  '2026-12-12T20:00:00.000Z',
);
assert.equal(getStatusUpdatesOpenAt('2026-12-12', 'TBA'), null);

expectValidationError(
  { ...validInput, email: 'not-an-email' },
  'valid email',
);
expectValidationError(
  {
    ...validInput,
    payload: { ...validInput.payload, eventTime: '25:00 PM' },
  },
  'valid event time',
);
expectValidationError(
  {
    ...validInput,
    payload: { ...validInput.payload, eventAudience: 'Unknown' },
  },
  'valid event audience',
);
expectValidationError(
  {
    ...validInput,
    website: 'spam.example',
  },
  'Unable to accept',
);

console.log('Community event workflow validation passed.');
