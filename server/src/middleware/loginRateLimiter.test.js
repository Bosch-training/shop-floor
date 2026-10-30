jest.mock('../models/User', () =>
  require('../../tests/helpers/fakeUserModel').createFakeUserModule(),
);
jest.mock('../services/passwordService', () => {
  const actual = jest.requireActual('../services/passwordService');
  return { ...actual, verifyPassword: jest.fn(actual.verifyPassword) };
});

const request = require('supertest');
const { createApp } = require('../app');
const { User } = require('../models/User');
const { verifyPassword } = require('../services/passwordService');
const { buildTestConfig } = require('../../tests/helpers/testConfig');
const {
  PASSWORD,
  WRONG_PASSWORD,
  addStandardUsers,
} = require('../../tests/helpers/authHelpers');
const {
  freezeClock,
  setClock,
  restoreClock,
} = require('../../tests/helpers/clock');

const buildApp = (overrides) => createApp(null, buildTestConfig(overrides));

const login = (app, userId = 'sup01', password = WRONG_PASSWORD) =>
  request(app).post('/api/auth/login').send({ userId, password });

async function exhaust(app, times = 3) {
  for (let i = 0; i < times; i += 1) {
    await login(app);
  }
}

function expectRateLimited(res) {
  expect(res.status).toBe(429);
  expect(res.body.failures[0].rule).toBe('RATE_LIMITED');
  expect(res.headers['retry-after']).toBeDefined();
}

beforeEach(() => {
  User.__reset();
  jest.clearAllMocks();
  addStandardUsers(User);
});

afterEach(restoreClock);

describe('loginRateLimiter (LLD-FR-08, WIPC10-AC4)', () => {
  it('WIPC-10-TC-156 allows failed attempts up to the limit', async () => {
    const app = buildApp();

    for (let i = 0; i < 3; i += 1) {
      const res = await login(app);

      expect(res.status).toBe(401);
      expect(res.body.failures[0].rule).toBe('INVALID_CREDENTIALS');
    }
  });

  it('WIPC-10-TC-157 returns 429 and Retry-After at limit', async () => {
    const app = buildApp({ LOGIN_RATE_LIMIT_WINDOW_MS: '900000' });
    await exhaust(app);

    const res = await login(app);

    expect(res.status).toBe(429);
    const [failure] = res.body.failures;
    expect(failure.rule).toBe('RATE_LIMITED');
    expect(failure.message).toBe('Too many failed login attempts.');
    const retryAfter = Number(res.headers['retry-after']);
    expect(Number.isInteger(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(900);
    expect(failure.details.retryAfterSeconds).toBe(retryAfter);
  });

  it('WIPC-10-TC-158 does not count successful logins', async () => {
    const app = buildApp();
    await exhaust(app, 2);
    for (let i = 0; i < 10; i += 1) {
      const ok = await login(app, 'sup01', PASSWORD);
      expect(ok.status).toBe(200);
    }

    const res = await login(app);

    expect(res.status).toBe(401);
  });

  it('WIPC-10-TC-159 isolates counters per app instance', async () => {
    const appA = buildApp();
    await exhaust(appA);
    expect((await login(appA)).status).toBe(429);

    const res = await login(buildApp());

    expect(res.status).toBe(401);
    expect(res.body.failures[0].rule).toBe('INVALID_CREDENTIALS');
  });

  it('WIPC-10-TC-160 resets the budget after the window', async () => {
    freezeClock('2026-01-05T09:00:00Z');
    const app = buildApp({ LOGIN_RATE_LIMIT_WINDOW_MS: '60000' });
    await exhaust(app);
    expect((await login(app, 'sup01', PASSWORD)).status).toBe(429);

    setClock('2026-01-05T09:01:00.001Z');
    const res = await login(app, 'sup01', PASSWORD);

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('WIPC-10-TC-161 returns 429 for a right password', async () => {
    const app = buildApp();
    await exhaust(app);

    const res = await login(app, 'sup01', PASSWORD);

    expectRateLimited(res);
    expect(res.body.token).toBeUndefined();
  });

  it('WIPC-10-TC-162 limits per source, not per account', async () => {
    const app = buildApp();
    for (const id of ['ghost01', 'ghost02', 'ghost03']) {
      await login(app, id);
    }

    expectRateLimited(await login(app, 'ghost04'));
    expectRateLimited(await login(app, 'sup01'));
  });

  it('WIPC-10-TC-163 counts 403 and 400 responses', async () => {
    const app = buildApp();
    await login(app, 'ina01', PASSWORD);
    await login(app, 'ina01', PASSWORD);
    await request(app).post('/api/auth/login').send({ userId: 'sup01' });

    const res = await login(app, 'sup01', PASSWORD);

    expectRateLimited(res);
  });

  it('WIPC-10-TC-164 keeps tokens and hashes out of the 429 body', async () => {
    const app = buildApp();
    await exhaust(app);

    const res = await login(app, 'sup01', PASSWORD);

    const text = JSON.stringify(res.body);
    expect(text).not.toContain('token');
    expect(text).not.toContain('passwordHash');
    expect(text).not.toContain('$2');
    expect(Object.keys(res.body).sort()).toEqual(['error', 'failures']);
  });

  it('WIPC-10-TC-165 limits at the smallest maximum of 1', async () => {
    const app = buildApp({ LOGIN_RATE_LIMIT_MAX: '1' });

    const first = await login(app);
    const second = await login(app);

    expect(first.status).toBe(401);
    expect(first.body.failures[0].rule).toBe('INVALID_CREDENTIALS');
    expectRateLimited(second);
  });

  it('WIPC-10-TC-166 reports Retry-After of at least 1 second', async () => {
    freezeClock('2026-01-05T09:00:00Z');
    const app = buildApp({ LOGIN_RATE_LIMIT_WINDOW_MS: '60000' });
    await exhaust(app);

    setClock('2026-01-05T09:00:59.900Z');
    const res = await login(app);

    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBe('1');
    expect(res.body.failures[0].details.retryAfterSeconds).toBe(1);
  });

  it('WIPC-10-TC-167 allows exactly the limit in parallel', async () => {
    const app = buildApp();

    const responses = await Promise.all(
      Array.from({ length: 10 }, () => login(app)),
    );

    const statuses = responses.map((res) => res.status);
    expect(statuses.filter((s) => s === 401)).toHaveLength(3);
    expect(statuses.filter((s) => s === 429)).toHaveLength(7);
  });

  it('WIPC-10-TC-168 applies the limiter to login only', async () => {
    const app = buildApp();

    for (let i = 0; i < 10; i += 1) {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.failures[0].rule).toBe('UNAUTHENTICATED');
    }
  });

  it('WIPC-10-TC-169 sends standard draft-7 headers only', async () => {
    const app = buildApp();

    const res = await login(app);

    expect(res.headers.ratelimit).toBeDefined();
    expect(res.headers['ratelimit-policy']).toBeDefined();
    expect(res.headers['x-ratelimit-limit']).toBeUndefined();
    expect(res.headers['x-ratelimit-remaining']).toBeUndefined();
    expect(res.headers['x-ratelimit-reset']).toBeUndefined();
  });

  it('WIPC-10-TC-170 does not count malformed JSON', async () => {
    const app = buildApp();
    for (let i = 0; i < 3; i += 1) {
      const bad = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ not json');
      expect(bad.status).toBe(400);
    }

    const res = await login(app, 'sup01', PASSWORD);

    expect(res.status).toBe(200);
  });

  it('WIPC-10-TC-221 skips bcrypt once the source is limited', async () => {
    const app = buildApp();
    const statuses = [];

    for (let i = 0; i < 100; i += 1) {
      statuses.push((await login(app)).status);
    }

    expect(verifyPassword.mock.calls.length).toBeLessThanOrEqual(3);
    expect(statuses.slice(3).every((status) => status === 429)).toBe(true);
  });

  it('WIPC-10-TC-277 returns 429 before body validation', async () => {
    const app = buildApp();
    await exhaust(app);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ userId: { $gt: '' }, password: 'x' });

    expectRateLimited(res);
    expect(res.body.failures[0].rule).not.toBe('INVALID_INPUT');
  });
});
