const request = require('supertest');
const { z } = require('zod');
const { createApp } = require('../app');
const { validateRequest, findOperatorKeys } = require('./validateRequest');

const schemas = {
  body: z.strictObject({ id: z.string().min(1), qty: z.number().int() }),
  query: z.strictObject({ id: z.string().optional() }),
};

const app = createApp((a) => {
  a.post('/api/example', validateRequest(schemas), (req, res) =>
    res.json(req.validated),
  );
});

describe('findOperatorKeys (NFR-06, T-10)', () => {
  it('finds nested, array, dotted and __proto__ keys', () => {
    const value = JSON.parse(
      '{"a":{"$ne":1},"b":[{"$gt":2}],"c.d":3,"__proto__":{"x":1},"ok":1}',
    );

    expect(findOperatorKeys(value, 'body').sort()).toEqual([
      'body.__proto__',
      'body.a.$ne',
      'body.b.0.$gt',
      'body.c.d',
    ]);
  });

  it('returns nothing for plain values', () => {
    expect(findOperatorKeys({ a: 1, b: ['x'], c: null }, 'body')).toEqual([]);
  });
});

describe('validateRequest (LLD-FR-09)', () => {
  it('passes valid input into req.validated (T-08)', async () => {
    const res = await request(app)
      .post('/api/example')
      .send({ id: 'WO-1', qty: 3 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ body: { id: 'WO-1', qty: 3 }, query: {} });
  });

  it('returns all failures with paths (T-08)', async () => {
    const res = await request(app).post('/api/example').send({ id: '' });

    expect(res.status).toBe(400);
    const paths = res.body.failures.map((f) => f.details.path);
    expect(paths).toEqual(expect.arrayContaining(['body.id', 'body.qty']));
    expect(res.body.failures.every((f) => f.rule === 'INVALID_INPUT')).toBe(
      true,
    );
  });

  it('rejects an operator injection body (T-09)', async () => {
    const res = await request(app)
      .post('/api/example')
      .send({ id: { $ne: null }, qty: 1 });

    expect(res.status).toBe(400);
    expect(res.body.failures[0]).toMatchObject({
      rule: 'INVALID_INPUT',
      message: 'body.id.$ne: operator keys are not allowed.',
      details: { path: 'body.id.$ne' },
    });
  });

  it('rejects an operator injection query (T-11)', async () => {
    const res = await request(app)
      .post('/api/example?id[$ne]=x')
      .send({ id: 'WO-1', qty: 1 });

    expect(res.status).toBe(400);
    expect(res.body.failures[0].rule).toBe('INVALID_INPUT');
    expect(res.body.failures[0].details.path).toBe('query');
  });
});
