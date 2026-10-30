const { ROLES } = require('../models/User');
const { unauthenticated, forbidden } = require('../errors/authErrors');

const VALID_ROLES = new Set(Object.values(ROLES));

function requireRole(...roles) {
  // Set lookup, not `in`, so 'toString' or '__proto__' are not roles.
  if (roles.length === 0 || !roles.every((r) => VALID_ROLES.has(r))) {
    throw new TypeError('requireRole needs valid roles.');
  }
  return (req, res, next) => {
    if (!req.user) throw unauthenticated();
    if (!roles.includes(req.user.role)) {
      throw forbidden(req.user.role, roles);
    }
    next();
  };
}

module.exports = { requireRole };
