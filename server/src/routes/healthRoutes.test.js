const request = require('supertest');
const { createApp } = require('../app');

describe('GET /api/health (WIPC9-AC1, LLD-FR-01)', () => {
  const app = createApp();

  it('returns 200 and status ok without credentials (T-01)', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  it('exposes only status and timestamp (T-02)', async () => {
    const res = await request(app).get('/api/health');

    expect(Object.keys(res.body).sort()).toEqual(['status', 'timestamp']);
  });
});
