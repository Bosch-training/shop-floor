const { rateLimit } = require('express-rate-limit');
const { rateLimited } = require('../errors/authErrors');

// Only responses with status 400 or above count against the budget.
function createLoginRateLimiter(config) {
  return rateLimit({
    windowMs: config.loginRateLimitWindowMs,
    limit: config.loginRateLimitMax,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res, next) => {
      const seconds = Math.max(
        1,
        Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000),
      );
      res.set('Retry-After', String(seconds));
      next(rateLimited(seconds));
    },
  });
}

module.exports = { createLoginRateLimiter };
