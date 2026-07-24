const serverless = require('serverless-http');

const { app } = require('../../api/server');

const handler = serverless(app);

exports.handler = async (event, context) => {
  const path = event.path || '';

  if (path.startsWith('/.netlify/functions/api')) {
    const suffix = path.replace('/.netlify/functions/api', '');
    event.path = suffix.startsWith('/api') ? suffix : `/api${suffix}`;
  } else if (!path.startsWith('/api')) {
    event.path = `/api${path.startsWith('/') ? path : `/${path}`}`;
  }

  return handler(event, context);
};
