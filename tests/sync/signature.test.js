const assert = require('node:assert/strict');
const test = require('node:test');

const { signRequest, verifyRequest } = require('../../api/sync/signature');

test('accepts a valid timestamped HMAC signature', () => {
  const timestamp = `${Math.floor(Date.now() / 1000)}`;
  const body = JSON.stringify({ reason: 'event.changed', id: '42' });
  const signature = signRequest(
    'test-secret',
    timestamp,
    'POST',
    '/.netlify/functions/prod-sync',
    body,
  );

  assert.equal(
    verifyRequest({
      body,
      method: 'POST',
      path: '/.netlify/functions/prod-sync',
      secret: 'test-secret',
      signature,
      timestamp,
    }),
    true,
  );
});

test('rejects altered bodies and expired timestamps', () => {
  const timestamp = `${Math.floor(Date.now() / 1000)}`;
  const signature = signRequest('test-secret', timestamp, 'POST', '/sync', '{}');

  assert.equal(
    verifyRequest({
      body: '{"changed":true}',
      method: 'POST',
      path: '/sync',
      secret: 'test-secret',
      signature,
      timestamp,
    }),
    false,
  );

  assert.equal(
    verifyRequest({
      body: '{}',
      method: 'POST',
      path: '/sync',
      secret: 'test-secret',
      signature: signRequest(
        'test-secret',
        `${Number(timestamp) - 10 * 60}`,
        'POST',
        '/sync',
        '{}',
      ),
      timestamp: `${Number(timestamp) - 10 * 60}`,
    }),
    false,
  );
});
