jest.mock('../models/User', () =>
  require('../../tests/helpers/fakeUserModel').createFakeUserModule(),
);

const request = require('supertest');
const { createApp } = require('../app');
const { User } = require('../models/User');
const { authenticate } = require('./authenticate');
const { requireRole } = require('./requireRole');
const ValidationError = require('../errors/ValidationError');
const { buildTestConfig } = require('../../tests/helpers/testConfig');
const {
  addStandardUsers,
  signTestToken,
  signRawToken,
  bearer,
} = require('../../tests/helpers/authHelpers');

const config = buildTestConfig();
const state = { calls: 0, document: { value: 1 } };
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

const app = createApp((a) => {
  const hit = (req, res) => {
    state.calls += 1;
    if (req.body && req.body.value !== undefined) {
      state.document.value = req.body.value;
    }
    res.json({ ok: true });
  };
  const guard = (...roles) => [authenticate, requireRole(...roles), hit];
  a.post('/api/test/supervisor-only', ...guard('supervisor'));
  a.post('/api/test/operator-only', ...guard('operator'));
  a.post('/api/test/admin-only', ...guard('administrator'));
  a.post('/api/test/multi', ...guard('supervisor', 'administrator'));
  METHODS.forEach((method) => {
    a[method]('/api/test/any-method', ...guard('supervisor'));
  });
}, config);

const tokenFor = (userId) => signTestToken(userId);
const call = (path, userId, method = 'post') => {
  const req = request(app)[method](path);
  return userId ? req.set(bearer(tokenFor(userId))) : req;
};

beforeEach(() => {
  User.__reset();
  jest.clearAllMocks();
  state.calls = 0;
  state.document = { value: 1 };
  addStandardUsers(User);
});

describe('requireRole allows listed roles (LLD-FR-07, AC-09)', () => {
  it('WIPC-10-TC-173 passes a supervisor', async () => {
    const res = await call('/api/test/supervisor-only', 'sup01');

    expect(res.status).toBe(200);
    expect(state.calls).toBe(1);
  });

  it.each([
    ['WIPC-10-TC-174', '/api/test/supervisor-only', 'sup01'],
    ['WIPC-10-TC-174', '/api/test/operator-only', 'op01'],
    ['WIPC-10-TC-174', '/api/test/admin-only', 'adm01'],
    ['WIPC-10-TC-175', '/api/test/multi', 'sup01'],
    ['WIPC-10-TC-175', '/api/test/multi', 'adm01'],
  ])('%s passes %s for %s', async (id, path, userId) => {
    const res = await call(path, userId);

    expect(res.status).toBe(200);
  });

  it('WIPC-10-TC-176 reads the role from the db each time', async () => {
    const path = '/api/test/supervisor-only';
    const supBefore = await call(path, 'sup01');
    const opBefore = await call(path, 'op01');
    const byId = (id) => User.__users.find((u) => u.userId === id);
    byId('sup01').role = 'operator';
    byId('op01').role = 'supervisor';

    const supAfter = await call(path, 'sup01');
    const opAfter = await call(path, 'op01');

    expect([supBefore.status, opBefore.status]).toEqual([200, 403]);
    expect(supAfter.status).toBe(403);
    expect(supAfter.body.failures[0].rule).toBe('FORBIDDEN');
    expect(opAfter.status).toBe(200);
  });
});

describe('requireRole rejects other roles (WIPC10-AC3, AC-09)', () => {
  it('WIPC-10-TC-177 rejects an operator with FORBIDDEN details', async () => {
    const res = await call('/api/test/supervisor-only', 'op01');

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: 'ValidationError',
      failures: [
        {
          rule: 'FORBIDDEN',
          message: 'Role operator cannot perform this action.',
          fix: 'Sign in as supervisor or ask an Administrator for access.',
          details: { role: 'operator', allowedRoles: ['supervisor'] },
        },
      ],
    });
    expect(state.calls).toBe(0);
  });

  it.each([
    ['WIPC-10-TC-178', '/api/test/supervisor-only', 'adm01', ['supervisor']],
    ['WIPC-10-TC-179', '/api/test/admin-only', 'sup01', ['administrator']],
    [
      'WIPC-10-TC-180',
      '/api/test/multi',
      'op01',
      ['supervisor', 'administrator'],
    ],
  ])('%s returns 403 for %s as %s', async (id, path, userId, allowed) => {
    const res = await call(path, userId);

    expect(res.status).toBe(403);
    expect(res.body.failures[0].rule).toBe('FORBIDDEN');
    expect(res.body.failures[0].details).toEqual({
      role: User.__users.find((u) => u.userId === userId).role,
      allowedRoles: allowed,
    });
  });

  it('WIPC-10-TC-181 leaves data unchanged after a 403', async () => {
    const res = await call('/api/test/supervisor-only', 'op01').send({
      value: 5,
    });

    expect(res.status).toBe(403);
    expect(state.calls).toBe(0);
    expect(state.document).toEqual({ value: 1 });
  });

  it.each([
    ['WIPC-10-TC-182 no token', null],
    ['WIPC-10-TC-183 deactivated user', 'ina01'],
  ])('%s gives 401, not 403', async (name, userId) => {
    const res = await call('/api/test/supervisor-only', userId);

    expect(res.status).toBe(401);
    expect(res.body.failures[0].rule).toBe('UNAUTHENTICATED');
    expect(state.calls).toBe(0);
  });

  it('WIPC-10-TC-187 ignores a role claim forged in the token', async () => {
    const token = signRawToken({ sub: 'op01', role: 'administrator' });

    const res = await request(app)
      .post('/api/test/admin-only')
      .set(bearer(token));

    expect(res.status).toBe(403);
    expect(res.body.failures[0].details.role).toBe('operator');
  });

  it.each(METHODS)('WIPC-10-TC-189 returns 403 for %s', async (method) => {
    const res = await call('/api/test/any-method', 'op01', method);

    expect(res.status).toBe(403);
    expect(res.body.failures[0].rule).toBe('FORBIDDEN');
    expect(state.calls).toBe(0);
  });

  it('WIPC-10-TC-191 rejects 20 parallel operator calls', async () => {
    const responses = await Promise.all(
      Array.from({ length: 20 }, () =>
        call('/api/test/supervisor-only', 'op01'),
      ),
    );

    responses.forEach((res) => expect(res.status).toBe(403));
    expect(state.calls).toBe(0);
  });
});

describe('role permission matrix (WIPC-10-TC-190)', () => {
  const routes = {
    '/api/test/supervisor-only': ['sup01'],
    '/api/test/operator-only': ['op01'],
    '/api/test/admin-only': ['adm01'],
    '/api/test/multi': ['sup01', 'adm01'],
  };
  const combos = Object.keys(routes).flatMap((path) =>
    ['sup01', 'op01', 'adm01'].map((userId) => [
      path,
      userId,
      routes[path].includes(userId),
    ]),
  );

  it.each(combos)('%s as %s is allowed: %p', async (path, userId, allowed) => {
    const res = await call(path, userId);

    expect(res.status).toBe(allowed ? 200 : 403);
  });

  it.each(['sup01', 'op01', 'adm01'])('/api/auth/me allows %s', async (id) => {
    const res = await call('/api/auth/me', id, 'get');

    expect(res.status).toBe(200);
  });
});

describe('requireRole unit checks (LLD-FR-07, LLD-NFR-01)', () => {
  it('WIPC-10-TC-184 returns 401 without authenticate', () => {
    const middleware = requireRole('supervisor');

    const next = jest.fn();
    let error;
    try {
      middleware({ user: undefined }, {}, next);
    } catch (thrown) {
      error = thrown;
    }

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.status).toBe(401);
    expect(error.failures[0].rule).toBe('UNAUTHENTICATED');
    expect(next).not.toHaveBeenCalled();
  });

  it('WIPC-10-TC-185 throws TypeError when no roles are given', () => {
    expect(() => requireRole()).toThrow(TypeError);
    expect(() => requireRole()).toThrow('requireRole needs valid roles.');
  });

  it.each([
    ['WIPC-10-TC-186', 'superuser'],
    ['WIPC-10-TC-186', 'SUPERVISOR'],
    ['WIPC-10-TC-186', undefined],
    ['WIPC-10-TC-186', 42],
    ['WIPC-10-TC-188', 'toString'],
    ['WIPC-10-TC-188', 'constructor'],
    ['WIPC-10-TC-188', '__proto__'],
    ['WIPC-10-TC-188', 'hasOwnProperty'],
  ])('%s throws TypeError for the role %p', (id, role) => {
    expect(() => requireRole(role)).toThrow(TypeError);
  });
});
