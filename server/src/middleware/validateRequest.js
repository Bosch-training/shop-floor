const ValidationError = require('../errors/ValidationError');

const PARTS = ['body', 'query', 'params'];

// NFR-06: reject Mongo operator keys ($ne, a.b) and prototype pollution.
function findOperatorKeys(value, path) {
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => findOperatorKeys(item, `${path}.${i}`));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => {
      const here = `${path}.${key}`;
      const bad =
        key.startsWith('$') || key.includes('.') || key === '__proto__';
      return bad ? [here] : findOperatorKeys(child, here);
    });
  }
  return [];
}

function operatorKeyFailure(path) {
  return {
    rule: 'INVALID_INPUT',
    message: `${path}: operator keys are not allowed.`,
    fix: 'Send plain values only; remove keys that start with $.',
    details: { path },
  };
}

function issueToFailure(part, issue) {
  const path = [part, ...issue.path].join('.');
  return {
    rule: 'INVALID_INPUT',
    message: `${path}: ${issue.message}`,
    fix: `Correct ${path} and resubmit.`,
    details: { path },
  };
}

// Use z.strictObject schemas so unknown keys such as `id[$ne]` fail.
// Results go to req.validated because req.query is read-only in Express 5.
function validateRequest(schemas) {
  return (req, res, next) => {
    const failures = [];
    const validated = {};
    for (const part of PARTS) {
      for (const path of findOperatorKeys(req[part], part)) {
        failures.push(operatorKeyFailure(path));
      }
      if (schemas[part]) {
        const result = schemas[part].safeParse(req[part]);
        if (result.success) {
          validated[part] = result.data;
        } else {
          failures.push(
            ...result.error.issues.map((issue) => issueToFailure(part, issue)),
          );
        }
      }
    }
    if (failures.length > 0) {
      return next(new ValidationError(failures, 400));
    }
    req.validated = validated;
    return next();
  };
}

module.exports = { validateRequest, findOperatorKeys };
