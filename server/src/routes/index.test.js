jest.mock('../models/User', () =>
  require('../../tests/helpers/fakeUserModel').createFakeUserModule(),
);

const express = require('express');
const request = require('supertest');
const { createApp } = require('../app');
const { createRoutes } = require('./index');
const errorHandler = require('../middleware/errorHandler');
const { User } = require('../models/User');
const { buildTestConfig } = require('../../tests/helpers/testConfig');
const {
  addStandardUsers,
  signTestToken,
  bearer,
} = require('../../tests/helpers/authHelpers');

const config = buildTestConfig();

beforeEach(() => {
  User.__reset();
  addStandardUsers(User);
});

describe('unknown /api paths (LLD-FR-06, section 6.3)', () => {
  const app = createApp(null, config);

  it('WIPC-10-TC-055 returns 401, not 404, without a token', async () => {
    const res = await request(app).get('/api/nope');

    expect(res.status).toBe(401);
    expect(res.body.failures[0].rule).toBe('UNAUTHENTICATED');
  });

  it('WIPC-10-TC-058 returns 404 NOT_FOUND with a valid token', async () => {
    const res = await request(app)
      .get('/api/nope')
      .set(bearer(signTestToken('sup01')));

    expect(res.status).toBe(404);
    expect(res.body.failures[0].rule).toBe('NOT_FOUND');
  });
});

describe('createRoutes default protection (WIPC-10-TC-215)', () => {
  const state = { calls: 0 };
  const router = createRoutes(config);
  const handler = (req, res) => {
    state.calls += 1;
    res.json({ ok: true });
  };
  // Routes added after createRoutes sit behind authenticate.
  router.get('/test/a', handler);
  router.post('/test/b', handler);
  router.put('/test/c', handler);
  router.patch('/test/d', handler);
  router.delete('/test/e', handler);

  const app = express();
  app.locals.config = config;
  app.use(express.json());
  app.use('/api', router);
  app.use(errorHandler);

  it.each([
    ['get', '/api/test/a'],
    ['post', '/api/test/b'],
    ['put', '/api/test/c'],
    ['patch', '/api/test/d'],
    ['delete', '/api/test/e'],
    ['get', '/api/work-orders'],
    ['post', '/api/auth/me'],
    ['get', '/api/auth/login'],
    ['get', '/api/health/extra'],
  ])('%s %s without a token returns 401', async (method, path) => {
    const res = await request(app)[method](path);

    expect(res.status).toBe(401);
    expect(res.body.failures[0].rule).toBe('UNAUTHENTICATED');
    expect(state.calls).toBe(0);
  });

  it('keeps GET /api/health and POST /api/auth/login public', async () => {
    const health = await request(app).get('/api/health');
    const loginRes = await request(app).post('/api/auth/login').send({});

    expect(health.status).toBe(200);
    expect(loginRes.status).not.toBe(401);
  });
});
