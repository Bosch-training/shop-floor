const request = require('supertest');
const { createApp } = require('../app');
const ValidationError = require('../errors/ValidationError');

const app = createApp((a) => {
  a.get('/api/boom-validation', () => {
    throw new ValidationError(
      [
        {
          rule: 'MATERIAL_INSUFFICIENT',
          message: 'Material M-10 has 15 available, 20 required.',
          fix: 'Reduce the quantity or increase stock.',
          details: { available: 15, required: 20 },
        },
      ],
      422,
    );
  });
  a.get('/api/boom-unexpected', () => {
    throw new Error('secret internal detail');
  });
  a.post('/api/echo', (req, res) => res.json(req.body));
});

describe('error middleware (WIPC9-AC2, LLD-FR-07)', () => {
  it('returns the contract shape for an unknown route (T-03)', async () => {
    const res = await request(app).get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ValidationError');
    expect(res.body.failures[0]).toMatchObject({
      rule: 'NOT_FOUND',
      fix: 'Check the URL.',
    });
    expect(res.body.failures[0].message).toContain('GET /api/nope');
  });

  it('maps a thrown ValidationError to the contract (T-04)', async () => {
    const res = await request(app).get('/api/boom-validation');

    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      error: 'ValidationError',
      failures: [
        {
          rule: 'MATERIAL_INSUFFICIENT',
          message: 'Material M-10 has 15 available, 20 required.',
          fix: 'Reduce the quantity or increase stock.',
          details: { available: 15, required: 20 },
        },
      ],
    });
  });

  it('returns 400 INVALID_INPUT for malformed JSON (T-05)', async () => {
    const res = await request(app)
      .post('/api/echo')
      .set('Content-Type', 'application/json')
      .send('{ not json');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
    expect(res.body.failures[0].rule).toBe('INVALID_INPUT');
  });

  it('returns 500 without leaking internals (T-06)', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get('/api/boom-unexpected');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('InternalError');
    expect(res.body.failures[0].rule).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toMatch(/secret|stack|at /);
    spy.mockRestore();
  });
});
