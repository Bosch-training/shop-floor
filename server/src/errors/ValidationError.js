const ALLOWED_STATUSES = [400, 403, 404, 409, 422];

// Carries the FR-13 error contract: failures[] of { rule, message, fix }.
class ValidationError extends Error {
  constructor(failures, status = 422) {
    if (!Array.isArray(failures) || failures.length === 0) {
      throw new TypeError('ValidationError requires at least one failure.');
    }
    if (!ALLOWED_STATUSES.includes(status)) {
      throw new TypeError(`Status ${status} is not allowed.`);
    }
    super(failures[0].message);
    this.name = 'ValidationError';
    this.status = status;
    this.failures = failures;
  }
}

module.exports = ValidationError;
