const ValidationError = require('./ValidationError');

function unauthenticated() {
  return new ValidationError(
    [
      {
        rule: 'UNAUTHENTICATED',
        message: 'A valid token is required.',
        fix: 'Sign in again.',
      },
    ],
    401,
  );
}

function invalidCredentials() {
  return new ValidationError(
    [
      {
        rule: 'INVALID_CREDENTIALS',
        message: 'The user ID or password is incorrect.',
        fix: 'Check your user ID and password and try again.',
      },
    ],
    401,
  );
}

function accountInactive() {
  return new ValidationError(
    [
      {
        rule: 'ACCOUNT_INACTIVE',
        message: 'This account is deactivated.',
        fix: 'Ask an Administrator to reactivate the account.',
      },
    ],
    403,
  );
}

function forbidden(role, allowedRoles) {
  return new ValidationError(
    [
      {
        rule: 'FORBIDDEN',
        message: `Role ${role} cannot perform this action.`,
        fix:
          `Sign in as ${allowedRoles.join(' or ')} ` +
          'or ask an Administrator for access.',
        details: { role, allowedRoles },
      },
    ],
    403,
  );
}

function rateLimited(retryAfterSeconds) {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  const unit = minutes === 1 ? 'minute' : 'minutes';
  return new ValidationError(
    [
      {
        rule: 'RATE_LIMITED',
        message: 'Too many failed login attempts.',
        fix: `Wait ${minutes} ${unit} before trying again.`,
        details: { retryAfterSeconds },
      },
    ],
    429,
  );
}

module.exports = {
  unauthenticated,
  invalidCredentials,
  accountInactive,
  forbidden,
  rateLimited,
};
