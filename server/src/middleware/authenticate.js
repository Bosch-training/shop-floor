const { getUserForToken } = require('../services/authService');
const { unauthenticated } = require('../errors/authErrors');

async function authenticate(req, res, next) {
  const match = /^Bearer (\S+)$/.exec(req.get('authorization') ?? '');
  if (!match) throw unauthenticated();
  req.user = await getUserForToken(match[1], req.app.locals.config);
  next();
}

module.exports = { authenticate };
