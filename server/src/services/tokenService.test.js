const jwt = require('jsonwebtoken');
const { signToken, verifyToken } = require('./tokenService');
const ValidationError = require('../errors/ValidationError');
const {
  buildTestConfig,
  OTHER_SECRET,
} = require('../../tests/helpers/testConfig');
const {
  signTestToken,
  signRawToken,
  unsignedToken,
  tamperSignature,
} = require('../../tests/helpers/authHelpers');
const {
  freezeClock,
  setClock,
  restoreClock,
} = require('../../tests/helpers/clock');

const config = buildTestConfig();

function catchError(fn) {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return null;
}

function expectUnauthenticated(fn) {
  const error = catchError(fn);

  expect(error).toBeInstanceOf(ValidationError);
  expect(error.status).toBe(401);
  expect(error.failures[0]).toMatchObject({
    rule: 'UNAUTHENTICATED',
    message: 'A valid token is required.',
    fix: 'Sign in again.',
  });
}

afterEach(restoreClock);

describe('signToken and verifyToken (LLD-NFR-02, LLD-NFR-03)', () => {
  it('WIPC-10-TC-241 round trips with only sub, iat and exp', () => {
    const token = signToken('sup01', config);

    const payload = verifyToken(token, config);

    expect(payload.sub).toBe('sup01');
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sub']);
  });

  it('WIPC-10-TC-242 signs with HS256 and a 1 hour lifetime', () => {
    const { header, payload } = jwt.decode(signToken('sup01', config), {
      complete: true,
    });

    expect(header.alg).toBe('HS256');
    expect(payload.exp - payload.iat).toBe(3600);
  });

  it('WIPC-10-TC-243 honors a configured lifetime of 15 minutes', () => {
    const token = signToken('sup01', { ...config, jwtExpiresIn: '15m' });

    const payload = jwt.decode(token);

    expect(payload.exp - payload.iat).toBe(900);
  });
});

describe('verifyToken rejects bad tokens (LLD-FR-05, WIPC10-AC2)', () => {
  const sub = 'sup01';
  const cases = [
    ['WIPC-10-TC-244 expired', () => signTestToken(sub, { expiresIn: '-1s' })],
    [
      'WIPC-10-TC-245 tampered signature',
      () => tamperSignature(signTestToken(sub)),
    ],
    ['WIPC-10-TC-246 alg none', () => unsignedToken({ sub })],
    ['WIPC-10-TC-247 other secret', () => signTestToken(sub, {}, OTHER_SECRET)],
    [
      'WIPC-10-TC-248 HS512 with the correct secret',
      () => signTestToken(sub, { algorithm: 'HS512' }),
    ],
    [
      'WIPC-10-TC-251 nbf in the future',
      () => signTestToken(sub, { notBefore: '1h' }),
    ],
    [
      'WIPC-10-TC-249 object subject',
      () => signRawToken({ sub: { $ne: null } }),
    ],
    ['WIPC-10-TC-249 array subject', () => signRawToken({ sub: ['sup01'] })],
    ['WIPC-10-TC-249 numeric subject', () => signRawToken({ sub: 123 })],
    ['WIPC-10-TC-249 null subject', () => signRawToken({ sub: null })],
  ];

  it.each(cases)('%s throws 401 UNAUTHENTICATED', (name, makeToken) => {
    const token = makeToken();

    expectUnauthenticated(() => verifyToken(token, config));
  });

  it.each([
    ['empty string', ''],
    ['abc', 'abc'],
    ['two segments', 'a.b'],
    ['garbage segments', 'a.b.c'],
    ['undefined', undefined],
  ])('WIPC-10-TC-250 garbage input (%s) never leaks a raw error', (n, raw) => {
    expectUnauthenticated(() => verifyToken(raw, config));
  });

  it('WIPC-10-TC-253 uses the same text for every failure reason', () => {
    const tokens = [
      signTestToken(sub, { expiresIn: '-1s' }),
      tamperSignature(signTestToken(sub)),
      'not-a-jwt',
    ];

    const failures = tokens.map(
      (token) => catchError(() => verifyToken(token, config)).failures,
    );

    expect(failures[1]).toEqual(failures[0]);
    expect(failures[2]).toEqual(failures[0]);
  });

  it('WIPC-10-TC-254 accepts an empty-string subject', () => {
    const token = signRawToken({ sub: '' });

    expect(verifyToken(token, config).sub).toBe('');
  });

  it('WIPC-10-TC-252 is valid before and invalid after expiry', () => {
    freezeClock('2026-01-05T09:00:00Z');
    const token = signTestToken('sup01', { expiresIn: '1s' });

    setClock('2026-01-05T09:00:00.500Z');
    expect(verifyToken(token, config).sub).toBe('sup01');

    setClock('2026-01-05T09:00:02Z');
    expectUnauthenticated(() => verifyToken(token, config));
  });
});
