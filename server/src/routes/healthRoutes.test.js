const request = require('supertest');
const { createApp } = require('../app');
const { buildTestConfig } = require('../../tests/helpers/testConfig');

describe('GET /api/health (WIPC9-AC1, LLD-FR-01)', () => {
  const app = createApp(null, buildTestConfig());

  it(
    'WIPC-10-TC-040 returns 200 and status ok without credentials (T-01)',
    async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  it('WIPC-10-TC-200 exposes only status and timestamp (T-02)', async () => {
    const res = await request(app).get('/api/health');

    expect(Object.keys(res.body).sort()).toEqual(['status', 'timestamp']);
  });

  it.each([
    ['WIPC-10-TC-193 no header', {}],
    ['WIPC-10-TC-193 stale token', { Authorization: 'Bearer bad-token' }],
  ])('keeps health public: %s', async (name, headers) => {
    const res = await request(app).get('/api/health').set(headers);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });
});
