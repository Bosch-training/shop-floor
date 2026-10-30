const ValidationError = require('../errors/ValidationError');

function invalidBody(message, fix) {
  return {
    error: 'ValidationError',
    failures: [{ rule: 'INVALID_INPUT', message, fix }],
  };
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ValidationError) {
    return res.status(err.status).json({
      error: 'ValidationError',
      failures: err.failures,
    });
  }
  if (err.type === 'entity.parse.failed') {
    return res
      .status(400)
      .json(
        invalidBody(
          'The request body is not valid JSON.',
          'Send a well-formed JSON body.',
        ),
      );
  }
  if (err.type === 'entity.too.large') {
    return res
      .status(400)
      .json(
        invalidBody(
          'The request body is too large.',
          'Send a body smaller than 100 kb.',
        ),
      );
  }
  // Never log req.body, headers or tokens (NFR-10).
  console.error(err.name, err.message, err.stack);
  return res.status(500).json({
    error: 'InternalError',
    failures: [
      {
        rule: 'INTERNAL_ERROR',
        message: 'The server could not complete the request.',
        fix: 'Try again. If the problem continues, contact support.',
      },
    ],
  });
}

module.exports = errorHandler;
