const ValidationError = require('./ValidationError');

const failure = { rule: 'TIME_CONFLICT', message: 'm', fix: 'f' };

describe('ValidationError (LLD-FR-08, FR-13)', () => {
  it('carries failures and defaults to status 422', () => {
    const err = new ValidationError([failure]);

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ValidationError');
    expect(err.status).toBe(422);
    expect(err.failures).toEqual([failure]);
  });

  it.each([400, 401, 403, 404, 409, 422, 429])(
    'WIPC-10-TC-075 allows status %i',
    (status) => {
      expect(new ValidationError([failure], status).status).toBe(status);
    },
  );

  it.each([418, 402, 500, 0])(
    'WIPC-10-TC-078 rejects the unsupported status %i',
    (status) => {
      expect(() => new ValidationError([failure], status)).toThrow(TypeError);
    },
  );

  it('rejects a disallowed status (T-07)', () => {
    expect(() => new ValidationError([failure], 500)).toThrow(TypeError);
  });

  it('rejects empty failures (T-07)', () => {
    expect(() => new ValidationError([])).toThrow(TypeError);
  });
});
