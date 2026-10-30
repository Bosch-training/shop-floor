const express = require('express');
const { createRoutes } = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

// `extend` lets tests mount extra routes before /api (outside authenticate).
function createApp(extend, config) {
  if (!config) throw new TypeError('createApp requires a config.');
  const app = express();
  app.locals.config = config;
  app.set('query parser', 'simple');
  app.use(express.json({ limit: '100kb' }));
  if (extend) extend(app);
  app.use('/api', createRoutes(config));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
