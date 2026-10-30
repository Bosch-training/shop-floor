const fs = require('fs');
const dotenv = require('dotenv');
const { loadConfig } = require('./index');
const { envExamplePath } = require('../../tests/helpers/paths');

const validEnv = {
  MONGODB_URI: 'mongodb://localhost:27017/test?replicaSet=rs0',
  JWT_SECRET: 'x'.repeat(32),
  PLANT_TIME_ZONE: 'Asia/Kolkata',
};

describe('loadConfig (LLD-FR-04)', () => {
  it('returns a frozen camelCase object and applies defaults (T-12)', () => {
    const config = loadConfig(validEnv);

    expect(config).toEqual({
      nodeEnv: 'development',
      mongodbUri: validEnv.MONGODB_URI,
      jwtSecret: validEnv.JWT_SECRET,
      jwtExpiresIn: '1h',
      plantTimeZone: 'Asia/Kolkata',
      port: 3000,
      loginRateLimitMax: 5,
      loginRateLimitWindowMs: 900000,
    });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('coerces PORT from a string', () => {
    expect(loadConfig({ ...validEnv, PORT: '4100' }).port).toBe(4100);
  });

  it.each([
    ['MONGODB_URI', { MONGODB_URI: undefined }],
    ['JWT_SECRET', { JWT_SECRET: 'too-short' }],
    ['PLANT_TIME_ZONE', { PLANT_TIME_ZONE: 'Not/AZone' }],
    ['PORT', { PORT: '70000' }],
  ])('rejects an invalid %s without echoing values (T-13)', (name, patch) => {
    const env = { ...validEnv, ...patch };

    expect(() => loadConfig(env)).toThrow(`Invalid configuration: ${name}`);
    expect(() => loadConfig(env)).not.toThrow(/too-short|Not\/AZone|70000/);
  });

  it('accepts .env.example and lists every variable (T-14)', () => {
    const parsed = dotenv.parse(fs.readFileSync(envExamplePath));

    expect(Object.keys(parsed).sort()).toEqual([
      'ADMIN_NAME',
      'ADMIN_PASSWORD',
      'ADMIN_USER_ID',
      'JWT_EXPIRES_IN',
      'JWT_SECRET',
      'LOGIN_RATE_LIMIT_MAX',
      'LOGIN_RATE_LIMIT_WINDOW_MS',
      'MONGODB_URI',
      'NODE_ENV',
      'PLANT_TIME_ZONE',
      'PORT',
    ]);
    expect(() => loadConfig(parsed)).not.toThrow();
  });
});

describe('loadConfig login rate limit and secrets (LLD-FR-15)', () => {
  it('WIPC-10-TC-066 applies defaults for the new settings', () => {
    const config = loadConfig(validEnv);

    expect(config.loginRateLimitMax).toBe(5);
    expect(config.loginRateLimitWindowMs).toBe(900000);
    expect(config.jwtExpiresIn).toBe('1h');
  });

  it('WIPC-10-TC-067 coerces the overrides to numbers', () => {
    const config = loadConfig({
      ...validEnv,
      LOGIN_RATE_LIMIT_MAX: '3',
      LOGIN_RATE_LIMIT_WINDOW_MS: '60000',
    });

    expect(config.loginRateLimitMax).toBe(3);
    expect(config.loginRateLimitWindowMs).toBe(60000);
  });

  it('WIPC-10-TC-068 uses placeholders only in .env.example', () => {
    const parsed = dotenv.parse(fs.readFileSync(envExamplePath));

    ['ADMIN_USER_ID', 'ADMIN_NAME', 'ADMIN_PASSWORD'].forEach((key) => {
      expect(parsed[key]).toBeTruthy();
    });
    expect(parsed.ADMIN_PASSWORD).toMatch(/change|replace|placeholder/i);
    expect(parsed.LOGIN_RATE_LIMIT_MAX).toBeDefined();
    expect(parsed.LOGIN_RATE_LIMIT_WINDOW_MS).toBeDefined();
  });

  it.each([
    ['LOGIN_RATE_LIMIT_MAX', '0'],
    ['LOGIN_RATE_LIMIT_MAX', '-1'],
    ['LOGIN_RATE_LIMIT_MAX', 'abc'],
    ['LOGIN_RATE_LIMIT_MAX', '2.5'],
    ['LOGIN_RATE_LIMIT_WINDOW_MS', '999'],
    ['LOGIN_RATE_LIMIT_WINDOW_MS', '0'],
    ['LOGIN_RATE_LIMIT_WINDOW_MS', 'abc'],
  ])(
    'WIPC-10-TC-069 / WIPC-10-TC-070 rejects %s=%s by name only',
    (name, value) => {
    let message = '';
    try {
      loadConfig({ ...validEnv, [name]: value });
    } catch (error) {
      message = error.message;
    }

    expect(message).toBe(`Invalid configuration: ${name}`);
    expect(message.replace(name, '')).not.toContain(value);
  });

  it.each([
    ['WIPC-10-TC-071 missing', undefined],
    ['WIPC-10-TC-071 31 characters', 'abcdefghijklmnopqrstuvwxyz01234'],
  ])('%s JWT_SECRET is rejected without echoing it', (name, secret) => {
    const env = { ...validEnv, JWT_SECRET: secret };

    expect(() => loadConfig(env)).toThrow('Invalid configuration: JWT_SECRET');
    if (secret) expect(() => loadConfig(env)).not.toThrow(secret);
  });

  it.each([
    [
      'WIPC-10-TC-072 max of 1',
      { LOGIN_RATE_LIMIT_MAX: '1' },
      'loginRateLimitMax',
      1,
    ],
    [
      'WIPC-10-TC-072 window of 1000',
      { LOGIN_RATE_LIMIT_WINDOW_MS: '1000' },
      'loginRateLimitWindowMs',
      1000,
    ],
    [
      'WIPC-10-TC-072 secret of exactly 32 characters',
      { JWT_SECRET: 's'.repeat(32) },
      'jwtSecret',
      's'.repeat(32),
    ],
  ])('%s is accepted', (name, patch, key, expected) => {
    expect(loadConfig({ ...validEnv, ...patch })[key]).toBe(expected);
  });

  it('WIPC-10-TC-073 reports every invalid new variable by name only', () => {
    let message = '';
    try {
      loadConfig({
        ...validEnv,
        LOGIN_RATE_LIMIT_MAX: 'abc',
        LOGIN_RATE_LIMIT_WINDOW_MS: '5',
      });
    } catch (error) {
      message = error.message;
    }

    expect(message).toContain('LOGIN_RATE_LIMIT_MAX');
    expect(message).toContain('LOGIN_RATE_LIMIT_WINDOW_MS');
    expect(message).not.toContain('abc');
    expect(message).not.toMatch(/5/);
  });

  it('WIPC-10-TC-074 returns a frozen config', () => {
    const config = loadConfig(validEnv);

    expect(() => {
      'use strict';
      config.loginRateLimitMax = 99;
    }).toThrow(TypeError);
    expect(config.loginRateLimitMax).toBe(5);
  });
});
