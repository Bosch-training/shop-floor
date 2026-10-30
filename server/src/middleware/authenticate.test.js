jest.mock('../models/User', () =>
  require('../../tests/helpers/fakeUserModel').createFakeUserModule(),
);

const request = require('supertest');
const { createApp } = require('../app');
const { User } = require('../models/User');
const { authenticate } = require('./authenticate');
const ValidationError = require('../errors/ValidationError');
const {
  buildTestConfig,
  OTHER_SECRET,
} = require('../../tests/helpers/testConfig');
const {
  USERS,
  addStandardUsers,
  signTestToken,
  signRawToken,
  unsignedToken,
  tamperSignature,
  bearer,
} = require('../../tests/helpers/authHelpers');
const {
  freezeClock,
  setClock,
  restoreClock,
} = require('../../tests/helpers/clock');

const config = buildTestConfig();
const unauthenticatedBody = {
  error: 'ValidationError',
  failures: [
    {
      rule: 'UNAUTHENTICATED',
      message: 'A valid token is required.',
      fix: 'Sign in again.',
    },
  ],
};
const counter = { calls: 0 };

const app = createApp((a) => {
  const hit = (req, res) => {
    counter.calls += 1;
    res.json(req.user);
  };
  a.get('/api/test/whoami', authenticate, hit);
  a.all('/api/test/counter', authenticate, hit);
}, config);

function expectUnauthenticated(res) {
  expect(res.status).toBe(401);
  expect(res.body).toEqual(unauthenticatedBody);
}

beforeEach(() => {
  User.__reset();
  jest.clearAllMocks();
  counter.calls = 0;
  addStandardUsers(User);
});

afterEach(restoreClock);

describe('authenticate (LLD-FR-05, WIPC10-AC2)', () => {
  it('WIPC-10-TC-038 accepts a valid token and sets req.user', async () => {
    const res = await request(app)
      .get('/api/test/whoami')
      .set(bearer(signTestToken('sup01')));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: expect.stringMatching(/^[0-9a-f]{24}$/),
      ...USERS.sup01,
    });
  });

  it('WIPC-10-TC-042 rejects a missing header with the contract', async () => {
    const res = await request(app).get('/api/test/whoami');

    expectUnauthenticated(res);
  });

  const t1 = signTestToken('sup01');
  it.each([
    ['WIPC-10-TC-043 Basic scheme', 'Basic c3VwMDE6Q29ycmVjdC1Ib3JzZS00Mg=='],
    ['WIPC-10-TC-044 empty Bearer token', 'Bearer '],
    ['WIPC-10-TC-044 Bearer without token', 'Bearer'],
    ['WIPC-10-TC-045 extra parts', `Bearer ${t1} extra`],
    ['WIPC-10-TC-046 not a JWT', 'Bearer not-a-jwt'],
    ['WIPC-10-TC-062 10,000 character token', `Bearer ${'a'.repeat(10000)}`],
  ])('%s is rejected with 401', async (name, header) => {
    const res = await request(app)
      .get('/api/test/whoami')
      .set('Authorization', header);

    expectUnauthenticated(res);
    expect(counter.calls).toBe(0);
  });

  it.each([
    [
      'WIPC-10-TC-047 expired',
      () => signTestToken('sup01', { expiresIn: '-1s' }),
    ],
    [
      'WIPC-10-TC-048 tampered signature',
      () => tamperSignature(signTestToken('sup01')),
    ],
    ['WIPC-10-TC-049 alg none', () => unsignedToken({ sub: 'adm01' })],
    [
      'WIPC-10-TC-050 other secret',
      () => signTestToken('sup01', {}, OTHER_SECRET),
    ],
    [
      'WIPC-10-TC-216 guessable secret',
      () => signTestToken('sup01', {}, 'secret'),
    ],
    ['WIPC-10-TC-063 empty subject', () => signRawToken({ sub: '' })],
  ])('%s is rejected on /api/auth/me', async (name, makeToken) => {
    const res = await request(app).get('/api/auth/me').set(bearer(makeToken()));

    expectUnauthenticated(res);
  });

  it('WIPC-10-TC-051 rejects a token issued before deactivation', async () => {
    const token = signTestToken('sup01');
    const before = await request(app).get('/api/auth/me').set(bearer(token));
    User.__users.find((u) => u.userId === 'sup01').status = 'inactive';

    const after = await request(app).get('/api/auth/me').set(bearer(token));

    expect(before.status).toBe(200);
    expectUnauthenticated(after);
  });

  it('WIPC-10-TC-052 rejects a token for a deleted user', async () => {
    const token = signTestToken('sup01');
    User.__reset();

    const res = await request(app).get('/api/auth/me').set(bearer(token));

    expectUnauthenticated(res);
  });

  it('WIPC-10-TC-053 rejects an object subject before any query', async () => {
    const token = signRawToken({ sub: { $ne: null } });

    const res = await request(app).get('/api/auth/me').set(bearer(token));

    expectUnauthenticated(res);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('WIPC-10-TC-054 ignores a token in query or cookie', async () => {
    const token = signTestToken('sup01');

    const viaQuery = await request(app).get(`/api/auth/me?token=${token}`);
    const viaCookie = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `token=${token}`);

    expectUnauthenticated(viaQuery);
    expectUnauthenticated(viaCookie);
  });

  it.each(['get', 'post', 'put', 'patch', 'delete'])(
    'WIPC-10-TC-056 requires a token for %s',
    async (method) => {
      const res = await request(app)[method]('/api/test/counter');

      expectUnauthenticated(res);
      expect(counter.calls).toBe(0);
    },
  );

  it('WIPC-10-TC-057 same body for missing and inactive', async () => {
    const inactive = await request(app)
      .get('/api/auth/me')
      .set(bearer(signTestToken('ina01')));
    const missing = await request(app).get('/api/auth/me');

    expect(inactive.status).toBe(401);
    expect(inactive.body).toEqual(missing.body);
  });

  it('WIPC-10-TC-219 identical bodies for token failures', async () => {
    const tokens = [
      null,
      signTestToken('sup01', { expiresIn: '-1s' }),
      tamperSignature(signTestToken('sup01')),
    ];

    const bodies = [];
    for (const token of tokens) {
      const req = request(app).get('/api/auth/me');
      const res = await (token ? req.set(bearer(token)) : req);
      bodies.push(res.body);
    }

    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[2]).toEqual(bodies[0]);
  });

  it('WIPC-10-TC-060 accepts before exp, rejects after', async () => {
    freezeClock('2026-01-05T09:00:00Z');
    const token = signTestToken('sup01', { expiresIn: '60s' });

    setClock('2026-01-05T09:00:59Z');
    const before = await request(app).get('/api/auth/me').set(bearer(token));
    setClock('2026-01-05T09:01:01Z');
    const after = await request(app).get('/api/auth/me').set(bearer(token));

    expect(before.status).toBe(200);
    expectUnauthenticated(after);
  });

  it('WIPC-10-TC-064 authenticates 20 parallel requests', async () => {
    const token = signTestToken('sup01');

    const responses = await Promise.all(
      Array.from({ length: 20 }, () =>
        request(app).get('/api/auth/me').set(bearer(token)),
      ),
    );

    responses.forEach((res) => {
      expect(res.status).toBe(200);
      expect(res.body.user.userId).toBe('sup01');
    });
  });
});

describe('authenticate unit checks (LLD-FR-05)', () => {
  it('WIPC-10-TC-061 rejects a header with trailing whitespace', async () => {
    const req = {
      get: jest.fn(() => `Bearer ${signTestToken('sup01')} `),
      app: { locals: { config } },
    };
    const next = jest.fn();

    const run = async () => authenticate(req, {}, next);

    await expect(run()).rejects.toBeInstanceOf(ValidationError);
    await expect(run()).rejects.toMatchObject({
      status: 401,
      failures: [expect.objectContaining({ rule: 'UNAUTHENTICATED' })],
    });
    expect(next).not.toHaveBeenCalled();
  });
});
