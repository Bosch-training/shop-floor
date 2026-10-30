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
      'JWT_EXPIRES_IN',
      'JWT_SECRET',
      'MONGODB_URI',
      'NODE_ENV',
      'PLANT_TIME_ZONE',
      'PORT',
    ]);
    expect(() => loadConfig(parsed)).not.toThrow();
  });
});
