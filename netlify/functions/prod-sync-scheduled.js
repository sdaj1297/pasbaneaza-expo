const { runProductionSync, SyncAlreadyRunningError } = require('../../api/sync/prodMirror');

exports.handler = async () => {
  try {
    const result = await runProductionSync();
    console.log(JSON.stringify(result));
    return { statusCode: 200 };
  } catch (error) {
    if (error instanceof SyncAlreadyRunningError) {
      console.log('Production synchronization already running.');
      return { statusCode: 202 };
    }
    console.error(error);
    throw error;
  }
};
