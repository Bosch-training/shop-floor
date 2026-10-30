const authService = require('../services/authService');

async function login(req, res) {
  const result = await authService.login(
    req.validated.body,
    req.app.locals.config,
  );
  res.set('Cache-Control', 'no-store').json(result);
}

function me(req, res) {
  res
    .set('Cache-Control', 'no-store')
    .json({ user: authService.toPublicUser(req.user) });
}

module.exports = { login, me };
