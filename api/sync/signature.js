const crypto = require('crypto');

function signRequest(secret, timestamp, method, path, body = '') {
  const canonical = [
    String(timestamp),
    String(method).toUpperCase(),
    String(path),
    crypto.createHash('sha256').update(String(body)).digest('hex'),
  ].join('\n');

  return crypto.createHmac('sha256', String(secret)).update(canonical).digest('hex');
}

function verifyRequest({ secret, timestamp, method, path, body = '', signature, maxClockSkewSeconds = 300 }) {
  if (!secret || !signature || !/^\d+$/.test(String(timestamp || ''))) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > maxClockSkewSeconds) return false;

  const expected = signRequest(secret, timestamp, method, path, body);
  const expectedBuffer = Buffer.from(expected, 'hex');
  const suppliedBuffer = Buffer.from(String(signature).toLowerCase(), 'hex');
  return expectedBuffer.length === suppliedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
}

module.exports = { signRequest, verifyRequest };
