const { getFirebaseAdminAuth } = require('../../api/firebaseAdmin');
const { runProductionSync, SyncAlreadyRunningError } = require('../../api/sync/prodMirror');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed.' }) };
  }

  const authorization = event.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

  try {
    const claims = await getFirebaseAdminAuth().verifyIdToken(token);
    if (claims.admin !== true) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin access required.' }) };
    }

    const result = await runProductionSync();
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    if (error instanceof SyncAlreadyRunningError) {
      return { statusCode: 202, body: JSON.stringify({ ok: true, alreadyRunning: true }) };
    }
    console.error(error);
    return { statusCode: 401, body: JSON.stringify({ error: 'Unable to start production synchronization.' }) };
  }
};
