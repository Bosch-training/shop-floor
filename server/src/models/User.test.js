const { User, ROLES, USER_STATUSES } = require('./User');

// Validation runs in memory; no database connection is needed.
const valid = {
  userId: 'sup01',
  name: 'Asha Rao',
  passwordHash: '$2a$04$hashvalue',
  role: 'supervisor',
};

function validate(overrides = {}) {
  return new User({ ...valid, ...overrides }).validateSync();
}

describe('User model (LLD-FR-01, ST-1)', () => {
  it('WIPC-10-TC-261 defaults status to active and keeps timestamps', () => {
    const user = new User(valid);

    expect(validate()).toBeUndefined();
    expect(user.status).toBe('active');
    expect(user.userId).toBe('sup01');
    expect(User.schema.path('createdAt').instance).toBe('Date');
    expect(User.schema.path('updatedAt').instance).toBe('Date');
  });

  it('WIPC-10-TC-262 trims and lowercases userId and trims name', () => {
    const user = new User({
      ...valid,
      userId: ' SUP01 ',
      name: '  Asha Rao  ',
    });

    expect(user.userId).toBe('sup01');
    expect(user.name).toBe('Asha Rao');
  });

  it.each([
    ['supervisor', 'active'],
    ['operator', 'active'],
    ['administrator', 'inactive'],
  ])('WIPC-10-TC-263 accepts role %s with status %s', (role, status) => {
    expect(validate({ role, status })).toBeUndefined();
  });

  it('WIPC-10-TC-263 exports ROLES and USER_STATUSES', () => {
    expect(Object.values(ROLES).sort()).toEqual([
      'administrator',
      'operator',
      'supervisor',
    ]);
    expect(Object.values(USER_STATUSES).sort()).toEqual(['active', 'inactive']);
  });

  it('WIPC-10-TC-264 excludes passwordHash from queries by default', () => {
    expect(User.schema.path('passwordHash').options.select).toBe(false);
  });

  it('WIPC-10-TC-265 drops passwordHash and __v in toJSON', () => {
    const user = new User(valid);

    const json = JSON.stringify(user);

    expect(json).not.toContain('passwordHash');
    expect(json).not.toContain('__v');
  });

  it('WIPC-10-TC-266 declares a unique index on userId', () => {
    const index = User.schema
      .indexes()
      .find(([fields]) => Object.keys(fields).join() === 'userId');

    expect(index[0]).toEqual({ userId: 1 });
    expect(index[1].unique).toBe(true);
  });

  it.each([['userId'], ['name'], ['passwordHash'], ['role']])(
    'WIPC-10-TC-267 rejects a user missing %s',
    (field) => {
      const error = validate({ [field]: undefined });

      expect(error.errors[field]).toBeDefined();
    },
  );

  it.each([['manager'], ['Supervisor'], ['']])(
    'WIPC-10-TC-268 rejects the invalid role %p',
    (role) => {
      expect(validate({ role }).errors.role).toBeDefined();
    },
  );

  it('WIPC-10-TC-269 rejects an invalid status', () => {
    expect(validate({ status: 'suspended' }).errors.status).toBeDefined();
  });

  it.each([['userId'], ['name']])(
    'WIPC-10-TC-271 rejects a whitespace-only %s',
    (field) => {
      expect(validate({ [field]: '   ' }).errors[field]).toBeDefined();
    },
  );

  it('WIPC-10-TC-272 rejects an operator object as userId', () => {
    const error = validate({ userId: { $gt: '' } });

    expect(error.errors.userId).toBeDefined();
  });

  it('WIPC-10-TC-275 keeps sanitizeFilter on for operators', () => {
    const query = User.findOne({ userId: { $ne: null } }).setOptions({
      sanitizeFilter: true,
    });

    query._castConditions();

    expect(query.error().name).toBe('CastError');
    expect(query.getFilter()).toEqual({ userId: { $eq: { $ne: null } } });
  });

  it.each([
    ['userId', 64, true],
    ['userId', 65, false],
    ['name', 100, true],
    ['name', 101, false],
  ])(
    'WIPC-10-TC-273 / WIPC-10-TC-274 %s of %i characters is valid: %p',
    (f, size, ok) => {
    const error = validate({ [f]: 'a'.repeat(size) });

    expect(error === undefined).toBe(ok);
  });
});
