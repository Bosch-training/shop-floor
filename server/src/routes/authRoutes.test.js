jest.mock('../models/User', () =>
  require('../../tests/helpers/fakeUserModel').createFakeUserModule(),
);

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../app');
const { User } = require('../models/User');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/requireRole');
const { rejectingQuery } = require('../../tests/helpers/fakeUserModel');
const { buildTestConfig } = require('../../tests/helpers/testConfig');
const {
  PASSWORD,
  WRONG_PASSWORD,
  USERS,
  addUser,
  addStandardUsers,
  signTestToken,
  bearer,
} = require('../../tests/helpers/authHelpers');
const { freezeClock, restoreClock } = require('../../tests/helpers/clock');

function buildApp(overrides = {}) {
  return createApp(
    (a) => {
      a.get(
        '/api/test/admin-only',
        authenticate,
        requireRole('administrator'),
        (req, res) => res.json({ ok: true }),
      );
      a.get('/api/test/boom', authenticate, () => {
        throw new Error('db down');
      });
    },
    buildTestConfig({ LOGIN_RATE_LIMIT_MAX: '50', ...overrides }),
  );
}

let app;
const login = (body, target = app) =>
  request(target).post('/api/auth/login').send(body);
const credentials = (userId = 'sup01', password = PASSWORD) => ({
  userId,
  password,
});
const me = (token, target = app) =>
  request(target).get('/api/auth/me').set(bearer(token));

function expectInvalidInput(res, path) {
  expect(res.status).toBe(400);
  expect(res.body.failures[0].rule).toBe('INVALID_INPUT');
  expect(res.body.token).toBeUndefined();
  if (path) {
    expect(res.body.failures.map((f) => f.details.path)).toContain(path);
  }
}

beforeEach(() => {
  User.__reset();
  jest.clearAllMocks();
  addStandardUsers(User);
  app = buildApp();
});

const spies = [];
function spyConsole(...methods) {
  return methods.map((method) => {
    const spy = jest.spyOn(console, method).mockImplementation(() => {});
    spies.push(spy);
    return spy;
  });
}

afterEach(() => {
  restoreClock();
  spies.splice(0).forEach((spy) => spy.mockRestore());
});

describe('POST /api/auth/login success (LLD-FR-03, WIPC10-AC1)', () => {
  it('WIPC-10-TC-082 returns token, expiresAt and user', async () => {
    const res = await login(credentials());

    expect(res.status).toBe(200);
    expect(res.body.token.split('.')).toHaveLength(3);
    expect(res.body.tokenType).toBe('Bearer');
    expect(res.body.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
    expect(res.body.user).toEqual(USERS.sup01);
  });

  it.each([
    ['WIPC-10-TC-083', 'sup01', 'supervisor'],
    ['WIPC-10-TC-083', 'op01', 'operator'],
    ['WIPC-10-TC-083', 'adm01', 'administrator'],
  ])('%s logs in %s as %s', async (id, userId, role) => {
    const res = await login(credentials(userId));

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe(role);
  });

  it('WIPC-10-TC-041 keeps login public (no header)', async () => {
    const res = await login(credentials());

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('WIPC-10-TC-084 sends Cache-Control no-store', async () => {
    const res = await login(credentials());

    expect(res.headers['cache-control']).toBe('no-store');
  });

  it.each([[' SUP01 '], ['Sup01']])(
    'WIPC-10-TC-085 normalizes the userId %p',
    async (userId) => {
      const res = await login(credentials(userId));

      expect(res.status).toBe(200);
      expect(res.body.user.userId).toBe('sup01');
    },
  );

  it('WIPC-10-TC-086 sets expiresAt to now plus 1h (UTC)', async () => {
    freezeClock('2026-10-30T10:15:30Z');

    const res = await login(credentials());

    expect(res.body.expiresAt).toBe('2026-10-30T11:15:30.000Z');
  });

  it('WIPC-10-TC-087 issues HS256 token with sub, iat, exp', async () => {
    const res = await login(credentials());

    const { header, payload } = jwt.decode(res.body.token, { complete: true });

    expect(header.alg).toBe('HS256');
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sub']);
    expect(payload.sub).toBe('sup01');
  });

  it('WIPC-10-TC-088 accepts a 72-byte multi-byte password', async () => {
    const password = 'é'.repeat(36);
    addUser(User, { ...USERS.op01, userId: 'uni01' }, {}, password);

    const res = await login(credentials('uni01', password));

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('WIPC-10-TC-142 returns expiresAt in UTC for any zone', async () => {
    freezeClock('2026-03-08T06:30:00Z');
    const zones = ['Asia/Kolkata', 'America/New_York'];

    for (const zone of zones) {
      const res = await login(
        credentials(),
        buildApp({ PLANT_TIME_ZONE: zone }),
      );

      expect(res.body.expiresAt).toMatch(
        /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/,
      );
      expect(res.body.expiresAt).toBe('2026-03-08T07:30:00.000Z');
    }
  });

  it('WIPC-10-TC-113 ignores a stale Authorization header', async () => {
    const res = await login(credentials()).set(bearer('expired-token'));

    expect(res.status).toBe(200);
  });

  it('WIPC-10-TC-114 serves 10 parallel valid logins', async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => login(credentials())),
    );

    for (const res of responses) {
      expect(res.status).toBe(200);
      expect((await me(res.body.token)).status).toBe(200);
    }
  });

  it('WIPC-10-TC-115 allows an idempotent repeat of a login', async () => {
    const snapshot = JSON.stringify(User.__users);

    const first = await login(credentials());
    const second = await login(credentials());

    expect((await me(first.body.token)).status).toBe(200);
    expect((await me(second.body.token)).status).toBe(200);
    expect(JSON.stringify(User.__users)).toBe(snapshot);
  });

  it('WIPC-10-TC-110 accepts a one-character userId', async () => {
    addUser(User, { ...USERS.op01, userId: 'a' });

    const res = await login(credentials('a'));

    expect(res.status).toBe(200);
  });
});

describe('POST /api/auth/login failures (LLD-FR-09, LLD-FR-10)', () => {
  const invalidCredentials = {
    rule: 'INVALID_CREDENTIALS',
    message: 'The user ID or password is incorrect.',
    fix: 'Check your user ID and password and try again.',
  };

  it('WIPC-10-TC-089 rejects a wrong password with 401', async () => {
    const res = await login(credentials('sup01', WRONG_PASSWORD));

    expect(res.status).toBe(401);
    expect(res.body.failures).toEqual([invalidCredentials]);
    expect(res.body.token).toBeUndefined();
  });

  it('WIPC-10-TC-090 same body: unknown user, wrong pw', async () => {
    const unknown = await login(credentials('ghost01'));
    const wrong = await login(credentials('sup01', WRONG_PASSWORD));

    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it('WIPC-10-TC-091 rejects a deactivated user with 403', async () => {
    const res = await login(credentials('ina01'));

    expect(res.status).toBe(403);
    expect(res.body.failures).toEqual([
      {
        rule: 'ACCOUNT_INACTIVE',
        message: 'This account is deactivated.',
        fix: 'Ask an Administrator to reactivate the account.',
      },
    ]);
    expect(res.body.token).toBeUndefined();
  });

  it('WIPC-10-TC-092 returns 401 for inactive, wrong pw', async () => {
    const res = await login(credentials('ina01', WRONG_PASSWORD));

    expect(res.status).toBe(401);
    expect(res.body.failures).toEqual([invalidCredentials]);
  });

  it('WIPC-10-TC-111 whitespace password is a credential error', async () => {
    const res = await login(credentials('sup01', '   '));

    expect(res.status).toBe(401);
    expect(res.body.failures[0].rule).toBe('INVALID_CREDENTIALS');
  });

  it('WIPC-10-TC-107 returns 401 for GET /api/auth/login', async () => {
    const res = await request(app).get('/api/auth/login');

    expect(res.status).toBe(401);
    expect(res.body.failures[0].rule).toBe('UNAUTHENTICATED');
  });
});

describe('POST /api/auth/login input validation (LLD-FR-12, NFR-06)', () => {
  it.each([
    ['WIPC-10-TC-093 missing userId', { password: PASSWORD }, 'body.userId'],
    ['WIPC-10-TC-094 missing password', { userId: 'sup01' }, 'body.password'],
    ['WIPC-10-TC-096 empty userId', credentials('', PASSWORD), 'body.userId'],
    [
      'WIPC-10-TC-096 empty password',
      credentials('sup01', ''),
      'body.password',
    ],
    [
      'WIPC-10-TC-097 numeric userId',
      { userId: 123, password: 'x' },
      'body.userId',
    ],
    [
      'WIPC-10-TC-097 boolean password',
      { userId: 'sup01', password: true },
      'body.password',
    ],
    [
      'WIPC-10-TC-097 array userId',
      { userId: ['sup01'], password: 'x' },
      'body.userId',
    ],
    [
      'WIPC-10-TC-098 extra role key',
      { ...credentials(), role: 'administrator' },
      null,
    ],
    [
      'WIPC-10-TC-100 $ne password',
      { userId: 'sup01', password: { $ne: null } },
      'body.password.$ne',
    ],
    [
      'WIPC-10-TC-101 $regex userId',
      { userId: { $regex: '.*' }, password: 'x' },
      'body.userId.$regex',
    ],
    [
      'WIPC-10-TC-101 $where userId',
      { userId: { $where: 'true' }, password: 'x' },
      'body.userId.$where',
    ],
    [
      'WIPC-10-TC-103 73-byte password',
      credentials('sup01', 'a'.repeat(73)),
      'body.password',
    ],
    [
      'WIPC-10-TC-104 65-character userId',
      credentials('u'.repeat(65), 'x'),
      'body.userId',
    ],
    [
      'WIPC-10-TC-109 74-byte password (37 characters)',
      credentials('ghost01', 'é'.repeat(37)),
      'body.password',
    ],
    ['WIPC-10-TC-110 whitespace-only userId', credentials('   ', 'x'), null],
  ])('%s returns 400 INVALID_INPUT', async (name, body, path) => {
    const res = await login(body);

    expectInvalidInput(res, path);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('WIPC-10-TC-095 rejects an empty object and a missing body', async () => {
    const empty = await login({});
    const missing = await request(app).post('/api/auth/login');

    expectInvalidInput(empty);
    expectInvalidInput(missing);
  });

  it('WIPC-10-TC-099 rejects the operator payload $gt in userId', async () => {
    const res = await login({ userId: { $gt: '' }, password: 'x' });

    expectInvalidInput(res);
    expect(res.body.failures[0]).toEqual({
      rule: 'INVALID_INPUT',
      message: 'body.userId.$gt: operator keys are not allowed.',
      fix: 'Send plain values only; remove keys that start with $.',
      details: { path: 'body.userId.$gt' },
    });
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it.each([
    ['userId.x', '{"userId.x":"a","password":"b"}'],
    ['__proto__', '{"__proto__":{"polluted":1},"password":"b"}'],
  ])('WIPC-10-TC-102 rejects the key %s', async (name, raw) => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(raw);

    expectInvalidInput(res);
    expect({}.polluted).toBeUndefined();
  });

  it('WIPC-10-TC-105 rejects malformed JSON', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ userId: sup01');

    expect(res.status).toBe(400);
    expect(res.body.failures[0]).toMatchObject({
      rule: 'INVALID_INPUT',
      message: 'The request body is not valid JSON.',
      fix: 'Send a well-formed JSON body.',
    });
  });

  it('WIPC-10-TC-106 rejects a body larger than 100 kb', async () => {
    const res = await login(credentials('sup01', 'a'.repeat(150000)));

    expectInvalidInput(res);
  });

  it('WIPC-10-TC-108 accepts 64 characters and rejects 65', async () => {
    const ok = await login(credentials('u'.repeat(64), 'x'));
    const tooLong = await login(credentials('u'.repeat(65), 'x'));

    expect(ok.status).toBe(401);
    expect(ok.body.failures[0].rule).toBe('INVALID_CREDENTIALS');
    expectInvalidInput(tooLong, 'body.userId');
  });

  it('WIPC-10-TC-109 accepts 72 ASCII bytes', async () => {
    const res = await login(credentials('ghost01', 'a'.repeat(72)));

    expect(res.status).toBe(401);
    expect(res.body.failures[0].rule).toBe('INVALID_CREDENTIALS');
  });

  it('WIPC-10-TC-112 rejects a non-JSON content type', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'text/plain')
      .send('userId=sup01&password=x');

    expectInvalidInput(res);
  });
});

describe('GET /api/auth/me (LLD-FR-04, WIPC10-AC1)', () => {
  it('WIPC-10-TC-130 returns the user without passwordHash', async () => {
    const { body } = await login(credentials());

    const res = await me(body.token);

    expect(res.status).toBe(200);
    expect(Object.keys(res.body)).toEqual(['user']);
    expect(res.body.user).toEqual(USERS.sup01);
  });

  it.each([['sup01'], ['op01'], ['adm01']])(
    'WIPC-10-TC-131 returns the matching user for %s',
    async (userId) => {
      const res = await me(signTestToken(userId));

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual(USERS[userId]);
    },
  );

  it('WIPC-10-TC-132 sends Cache-Control no-store', async () => {
    const res = await me(signTestToken('sup01'));

    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('WIPC-10-TC-133 returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.failures[0].rule).toBe('UNAUTHENTICATED');
    expect(res.body.user).toBeUndefined();
  });

  it('WIPC-10-TC-134 returns 401 for an invalid token', async () => {
    const res = await me('abc.def.ghi');

    expect(res.status).toBe(401);
    expect(res.body.failures[0].rule).toBe('UNAUTHENTICATED');
  });

  it('WIPC-10-TC-136 ignores query parameters', async () => {
    const res = await request(app)
      .get('/api/auth/me?userId=adm01')
      .set(bearer(signTestToken('sup01')));

    expect(res.status).toBe(200);
    expect(res.body.user.userId).toBe('sup01');
  });

  it('WIPC-10-TC-137 rejects non-GET methods on /me', async () => {
    const withToken = await request(app)
      .post('/api/auth/me')
      .set(bearer(signTestToken('sup01')));
    const withoutToken = await request(app).post('/api/auth/me');

    expect(withToken.status).toBe(404);
    expect(withToken.body.failures[0].rule).toBe('NOT_FOUND');
    expect(withoutToken.status).toBe(401);
    expect(withoutToken.body.failures[0].rule).toBe('UNAUTHENTICATED');
  });

  it('WIPC-10-TC-138 leaves data unchanged on repeated calls', async () => {
    const token = signTestToken('sup01');
    const snapshot = JSON.stringify(User.__users);

    const bodies = [];
    for (let i = 0; i < 3; i += 1) {
      bodies.push((await me(token)).body);
    }

    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[2]).toEqual(bodies[0]);
    expect(JSON.stringify(User.__users)).toBe(snapshot);
  });
});

describe('auth responses and logs stay clean (NFR-10, LLD-FR-11)', () => {
  const forbidden = ['passwordHash', '$2a$', '$2b$', PASSWORD];

  it('WIPC-10-TC-212 keeps hashes out of every response', async () => {
    const limited = buildApp({ LOGIN_RATE_LIMIT_MAX: '4' });
    spyConsole('error');
    const token = signTestToken('sup01');
    const responses = [
      await login(credentials(), limited),
      await login(credentials('sup01', WRONG_PASSWORD), limited),
      await login(credentials('ina01'), limited),
      await login({ userId: 'sup01' }, limited),
      await login(credentials('sup01', WRONG_PASSWORD), limited),
      await login(credentials(), limited),
      await me(token, limited),
      await request(limited).get('/api/test/admin-only'),
      await request(limited).get('/api/test/admin-only').set(bearer(token)),
      await request(limited).get('/api/test/boom').set(bearer(token)),
    ];

    expect(responses.map((r) => r.status)).toEqual([
      200, 401, 403, 400, 401, 429, 200, 401, 403, 500,
    ]);
    responses.forEach((res) => {
      const text = JSON.stringify({ body: res.body, headers: res.headers });
      forbidden.forEach((fragment) => expect(text).not.toContain(fragment));
    });
  });

  it('WIPC-10-TC-080 limits 401/403/429 to the contract', async () => {
    const limited = buildApp({ LOGIN_RATE_LIMIT_MAX: '1' });
    await login(credentials('sup01', WRONG_PASSWORD), limited);
    const token = signTestToken('sup01');
    const responses = [
      await request(limited).get('/api/auth/me'),
      await request(limited).get('/api/test/admin-only').set(bearer(token)),
      await login(credentials('sup01', WRONG_PASSWORD), limited),
    ];

    expect(responses.map((r) => r.status)).toEqual([401, 403, 429]);
    responses.forEach((res) => {
      expect(Object.keys(res.body).sort()).toEqual(['error', 'failures']);
      res.body.failures.forEach((failure) => {
        const keys = Object.keys(failure);
        expect(keys).toEqual(
          expect.arrayContaining(['rule', 'message', 'fix']),
        );
        keys.forEach((key) =>
          expect(['rule', 'message', 'fix', 'details']).toContain(key),
        );
      });
    });
  });

  it('WIPC-10-TC-213 logs no password, token or user ID', async () => {
    const logSpies = spyConsole('log', 'info', 'warn', 'error');

    const ok = await login(credentials());
    await login(credentials('sup01', WRONG_PASSWORD));
    await request(app).get('/api/auth/me');
    await request(app).get('/api/test/admin-only').set(bearer(ok.body.token));

    const output = logSpies
      .flatMap((spy) => spy.mock.calls.flat())
      .map(String)
      .join('\n');
    [PASSWORD, ok.body.token, 'sup01'].forEach((secret) =>
      expect(output).not.toContain(secret),
    );
  });

  it('WIPC-10-TC-217 no signal: unknown user vs wrong pw', async () => {
    const unknown = await login(credentials('ghost01', WRONG_PASSWORD));
    const wrong = await login(credentials('sup01', WRONG_PASSWORD));

    const stable = (headers) => {
      const copy = { ...headers };
      ['date', 'ratelimit', 'ratelimit-policy'].forEach((k) => delete copy[k]);
      return copy;
    };
    expect(unknown.status).toBe(wrong.status);
    expect(unknown.body).toEqual(wrong.body);
    expect(stable(unknown.headers)).toEqual(stable(wrong.headers));
  });

  it('WIPC-10-TC-218 returns a safe 500 and logs no credentials', async () => {
    const [spy] = spyConsole('error');
    User.findOne.mockImplementationOnce(() =>
      rejectingQuery(new Error('db down')),
    );

    const res = await login(credentials());

    expect(res.status).toBe(500);
    expect(res.body.failures[0].rule).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toMatch(/db down|stack| at /);
    expect(spy.mock.calls[0].slice(0, 2)).toEqual(['Error', 'db down']);
    const output = spy.mock.calls.flat().map(String).join('\n');
    expect(output).not.toContain(PASSWORD);
    expect(output).not.toContain('"password"');
  });
});
