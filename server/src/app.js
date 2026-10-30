const express = require('express');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

// `extend` lets tests mount extra routes before the 404 handler.
function createApp(extend) {
  const app = express();
  app.set('query parser', 'simple');
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', routes);
  if (extend) extend(app);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
