const express = require('express');
const { z } = require('zod');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authenticate');
const { createLoginRateLimiter } = require('../middleware/loginRateLimiter');
const { validateRequest } = require('../middleware/validateRequest');

const MAX_PASSWORD_BYTES = 72;

// 72 bytes is the bcrypt input limit; nothing is silently truncated.
const loginSchema = z.strictObject({
  userId: z.string().trim().toLowerCase().min(1).max(64),
  password: z
    .string()
    .min(1)
    .refine((value) => Buffer.byteLength(value) <= MAX_PASSWORD_BYTES, {
      message: `Must be at most ${MAX_PASSWORD_BYTES} bytes.`,
    }),
});

function createAuthRoutes(config) {
  const router = express.Router();
  router.post(
    '/login',
    createLoginRateLimiter(config),
    validateRequest({ body: loginSchema }),
    authController.login,
  );
  router.get('/me', authenticate, authController.me);
  return router;
}

module.exports = { createAuthRoutes };
