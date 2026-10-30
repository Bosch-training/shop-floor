const { loadConfig } = require('../../src/config');

// Test-only placeholder secret (32+ characters); not a real credential.
const TEST_SECRET = 'test-secret-test-secret-test-1234';
const OTHER_SECRET = 'other-secret-other-secret-other-1';

// Env-style overrides, for example { LOGIN_RATE_LIMIT_MAX: '5' }.
function buildTestConfig(overrides = {}) {
  return loadConfig({
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://localhost:27017/test?replicaSet=rs0',
    JWT_SECRET: TEST_SECRET,
    JWT_EXPIRES_IN: '1h',
    PLANT_TIME_ZONE: 'Asia/Kolkata',
    LOGIN_RATE_LIMIT_MAX: '3',
    LOGIN_RATE_LIMIT_WINDOW_MS: '900000',
    ...overrides,
  });
}

module.exports = { buildTestConfig, TEST_SECRET, OTHER_SECRET };
