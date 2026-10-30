const express = require('express');
const healthRoutes = require('./healthRoutes');
const { createAuthRoutes } = require('./authRoutes');
const { authenticate } = require('../middleware/authenticate');

// Only /health and POST /auth/login are public; everything mounted
// after authenticate is protected by default (NFR-04).
function createRoutes(config) {
  const router = express.Router();
  router.use('/health', healthRoutes);
  router.use('/auth', createAuthRoutes(config));
  router.use(authenticate);
  return router;
}

module.exports = { createRoutes };
