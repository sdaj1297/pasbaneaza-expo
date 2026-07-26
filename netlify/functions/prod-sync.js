const { runProductionSync, SyncAlreadyRunningError } = require('../../api/sync/prodMirror');
const { verifyRequest } = require('../../api/sync/signature');

exports.handler = async (event) => {
  const body = event.body || '';
  const timestamp = event.headers['x-pasban-timestamp'];
  const signature = event.headers['x-pasban-signature'];
  const secret = process.env.PASBAN_SYNC_SHARED_SECRET;
  const path = new URL(event.rawUrl || `https://pasban-beta.netlify.app${event.path}`).pathname;

  if (event.httpMethod !== 'POST' || !verifyRequest({
    secret,
    timestamp,
    method: 'POST',
    path,
    body,
    signature,
  })) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized sync request.' }) };
  }

  try {
    const result = await runProductionSync();
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    if (error instanceof SyncAlreadyRunningError) {
      return { statusCode: 202, body: JSON.stringify({ ok: true, alreadyRunning: true }) };
    }
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Production synchronization failed.' }) };
  }
};
