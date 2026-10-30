const jwt = require('jsonwebtoken');
const { unauthenticated } = require('../errors/authErrors');

function signToken(userId, config) {
  return jwt.sign({}, config.jwtSecret, {
    algorithm: 'HS256',
    subject: userId,
    expiresIn: config.jwtExpiresIn,
  });
}

function verifyToken(token, config) {
  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
    });
    // NFR-06: a non-string subject must never reach a query.
    if (typeof payload.sub !== 'string') throw new Error('bad subject');
    return payload;
  } catch {
    throw unauthenticated();
  }
}

module.exports = { signToken, verifyToken };
