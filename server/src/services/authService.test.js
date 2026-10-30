jest.mock('../models/User', () =>
  require('../../tests/helpers/fakeUserModel').createFakeUserModule(),
);
jest.mock('./passwordService', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));
jest.mock('./tokenService', () => {
  const actual = jest.requireActual('./tokenService');
  return { ...actual, signToken: jest.fn(actual.signToken) };
});

const jwt = require('jsonwebtoken');
const { buildTestConfig } = require('../../tests/helpers/testConfig');
const {
  USERS,
  PASSWORD,
  WRONG_PASSWORD,
  signTestToken,
  signRawToken,
} = require('../../tests/helpers/authHelpers');
const { freezeClock, restoreClock } = require('../../tests/helpers/clock');

const DUMMY_HASH = `$2a$12$${'D'.repeat(53)}`;
const fakeHash = (plain) => `$2a$04$fake.${plain}`;

let User;
let authService;
let passwordService;
let tokenService;
let config;

function addUser(key, overrides = {}) {
  return User.__add({
    ...USERS[key],
    passwordHash: fakeHash(PASSWORD),
    ...overrides,
  });
}

async function catchError(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return null;
}

const invalidCredentials = {
  rule: 'INVALID_CREDENTIALS',
  message: 'The user ID or password is incorrect.',
  fix: 'Check your user ID and password and try again.',
};
const unauthenticated = {
  rule: 'UNAUTHENTICATED',
  message: 'A valid token is required.',
  fix: 'Sign in again.',
};

beforeEach(() => {
  jest.resetModules();
  ({ User } = require('../models/User'));
  passwordService = require('./passwordService');
  tokenService = require('./tokenService');
  authService = require('./authService');
  passwordService.hashPassword.mockImplementation(async () => DUMMY_HASH);
  passwordService.verifyPassword.mockImplementation(
    async (plain, hash) => hash === fakeHash(plain),
  );
  config = buildTestConfig();
});

afterEach(restoreClock);

describe('authService.login (LLD-FR-03, LLD-FR-09, LLD-FR-10)', () => {
  it('WIPC-10-TC-023 returns token, tokenType, expiresAt, user', async () => {
    addUser('sup01');

    const result = await authService.login(
      { userId: 'sup01', password: PASSWORD },
      config,
    );

    expect(jwt.decode(result.token).sub).toBe('sup01');
    expect(result.tokenType).toBe('Bearer');
    expect(result.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
    expect(result.user).toEqual({
      userId: 'sup01',
      name: 'Asha Rao',
      role: 'supervisor',
      status: 'active',
    });
  });

  it.each([
    ['WIPC-10-TC-026', 'sup01', 'supervisor'],
    ['WIPC-10-TC-026', 'op01', 'operator'],
    ['WIPC-10-TC-026', 'adm01', 'administrator'],
  ])('%s returns the public role for %s', async (id, key, role) => {
    addUser(key);

    const { user } = await authService.login(
      { userId: key, password: PASSWORD },
      config,
    );

    expect(user.role).toBe(role);
    expect(user.status).toBe('active');
  });

  it('WIPC-10-TC-027 rejects a wrong password', async () => {
    addUser('sup01');

    const error = await catchError(
      authService.login({ userId: 'sup01', password: WRONG_PASSWORD }, config),
    );

    expect(error).toMatchObject({ name: 'ValidationError', status: 401 });
    expect(error.failures).toEqual([invalidCredentials]);
    expect(tokenService.signToken).not.toHaveBeenCalled();
  });

  it('WIPC-10-TC-028 uses a dummy hash for unknown users', async () => {
    addUser('sup01');
    const wrong = await catchError(
      authService.login({ userId: 'sup01', password: WRONG_PASSWORD }, config),
    );
    passwordService.verifyPassword.mockClear();

    const unknown = await catchError(
      authService.login({ userId: 'ghost01', password: PASSWORD }, config),
    );

    expect(passwordService.verifyPassword).toHaveBeenCalledTimes(1);
    expect(passwordService.verifyPassword).toHaveBeenCalledWith(
      PASSWORD,
      expect.stringMatching(/^\$2[aby]\$\d{2}\$.{53}$/),
    );
    expect(unknown.status).toBe(401);
    expect(unknown.failures).toEqual(wrong.failures);
  });

  it('WIPC-10-TC-029 rejects inactive user, right password', async () => {
    addUser('ina01');

    const error = await catchError(
      authService.login({ userId: 'ina01', password: PASSWORD }, config),
    );

    expect(error).toMatchObject({ name: 'ValidationError', status: 403 });
    expect(error.failures[0]).toMatchObject({
      rule: 'ACCOUNT_INACTIVE',
      message: 'This account is deactivated.',
      fix: 'Ask an Administrator to reactivate the account.',
    });
    expect(tokenService.signToken).not.toHaveBeenCalled();
  });

  it('WIPC-10-TC-030 hides inactive status on wrong pw', async () => {
    addUser('ina01');

    const error = await catchError(
      authService.login({ userId: 'ina01', password: WRONG_PASSWORD }, config),
    );

    expect(error.status).toBe(401);
    expect(error.failures).toEqual([invalidCredentials]);
  });

  it('WIPC-10-TC-034 creates the dummy hash once, with cost 12', async () => {
    const first = await catchError(
      authService.login({ userId: 'ghost01', password: 'x1y2z3-Pass' }, config),
    );
    const second = await catchError(
      authService.login({ userId: 'ghost02', password: 'x1y2z3-Pass' }, config),
    );

    expect(first.failures).toEqual([invalidCredentials]);
    expect(second.failures).toEqual([invalidCredentials]);
    expect(passwordService.hashPassword).toHaveBeenCalledTimes(1);
    expect(passwordService.hashPassword).toHaveBeenCalledWith(
      expect.any(String),
      12,
    );
  });

  it('WIPC-10-TC-036 derives expiresAt from the token exp claim', async () => {
    freezeClock('2026-10-30T10:15:30Z');
    addUser('sup01');

    const result = await authService.login(
      { userId: 'sup01', password: PASSWORD },
      config,
    );

    expect(result.expiresAt).toBe('2026-10-30T11:15:30.000Z');
    expect(result.expiresAt).toBe(
      new Date(jwt.decode(result.token).exp * 1000).toISOString(),
    );
  });

  it('WIPC-10-TC-037 keeps passwordHash out of the login result', async () => {
    addUser('sup01');

    const result = await authService.login(
      { userId: 'sup01', password: PASSWORD },
      config,
    );

    const text = JSON.stringify(result);
    expect(text).not.toContain('passwordHash');
    expect(text).not.toContain('$2a$');
    expect(text).not.toContain('$2b$');
  });
});

describe('authService.getUserForToken (LLD-FR-05, WIPC10-AC2)', () => {
  it('WIPC-10-TC-024 returns id, userId, name, role and status', async () => {
    addUser('sup01');

    const user = await authService.getUserForToken(
      signTestToken('sup01'),
      config,
    );

    expect(user).toEqual({
      id: expect.stringMatching(/^[0-9a-f]{24}$/),
      userId: 'sup01',
      name: 'Asha Rao',
      role: 'supervisor',
      status: 'active',
    });
  });

  it.each([
    ['WIPC-10-TC-031 user no longer exists', 'sup01', null],
    ['WIPC-10-TC-032 user is inactive', 'ina01', 'ina01'],
  ])('%s', async (name, sub, storedKey) => {
    if (storedKey) addUser(storedKey);

    const error = await catchError(
      authService.getUserForToken(signTestToken(sub), config),
    );

    expect(error).toMatchObject({ name: 'ValidationError', status: 401 });
    expect(error.failures).toEqual([unauthenticated]);
  });

  it('WIPC-10-TC-033 skips the lookup for an invalid token', async () => {
    const error = await catchError(
      authService.getUserForToken('not-a-jwt', config),
    );

    expect(error.status).toBe(401);
    expect(error.failures).toEqual([unauthenticated]);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('WIPC-10-TC-254 fails lookup for an empty subject', async () => {
    addUser('sup01');

    const error = await catchError(
      authService.getUserForToken(signRawToken({ sub: '' }), config),
    );

    expect(error.status).toBe(401);
    expect(error.failures).toEqual([unauthenticated]);
  });
});

describe('authService.toPublicUser (LLD-FR-11, LLD-NFR-03)', () => {
  const lean = {
    _id: 'a'.repeat(24),
    __v: 0,
    ...USERS.sup01,
    passwordHash: '$2a$04$x',
    createdAt: new Date('2026-10-30T10:00:00Z'),
    updatedAt: new Date('2026-10-30T10:00:00Z'),
  };

  it('WIPC-10-TC-025 whitelists fields for documents and lean objects', () => {
    const { User: RealUser } = jest.requireActual('../models/User');
    const doc = new RealUser({ ...USERS.sup01, passwordHash: '$2a$04$x' });

    expect(authService.toPublicUser(doc)).toEqual(USERS.sup01);
    expect(authService.toPublicUser(lean)).toEqual(USERS.sup01);
  });

  it('WIPC-10-TC-035 strips every extra field', () => {
    const keys = Object.keys(authService.toPublicUser(lean));

    expect(keys.sort()).toEqual(['name', 'role', 'status', 'userId']);
  });
});
