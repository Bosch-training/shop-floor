const ValidationError = require('../errors/ValidationError');

function notFound(req, res, next) {
  next(
    new ValidationError(
      [
        {
          rule: 'NOT_FOUND',
          message: `No route matches ${req.method} ${req.path}.`,
          fix: 'Check the URL.',
        },
      ],
      404,
    ),
  );
}

module.exports = notFound;
