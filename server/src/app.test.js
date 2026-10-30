jest.mock('./models/User', () =>
  require('../tests/helpers/fakeUserModel').createFakeUserModule(),
);

const request = require('supertest');
const { createApp } = require('./app');
const { buildTestConfig } = require('../tests/helpers/testConfig');

const config = buildTestConfig();

describe('createApp(extend, config) (LLD section 7.1, OQ-13)', () => {
  it('WIPC-10-TC-194 exposes the config on app.locals', () => {
    const app = createApp(null, config);

    expect(app.locals.config).toBe(config);
  });

  it('WIPC-10-TC-195 mounts extend before /api (no auth)', async () => {
    const app = createApp((a) => {
      a.get('/test-open', (req, res) => res.json({ open: true }));
    }, config);

    const open = await request(app).get('/test-open');
    const protectedRes = await request(app).get('/api/auth/me');

    expect(open.status).toBe(200);
    expect(open.body).toEqual({ open: true });
    expect(protectedRes.status).toBe(401);
  });

  it('WIPC-10-TC-198 throws TypeError when config is missing', () => {
    expect(() => createApp(null)).toThrow(TypeError);
  });
});
