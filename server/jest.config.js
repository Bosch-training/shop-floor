module.exports = {
  testEnvironment: 'node',
  // First run downloads a MongoDB binary for mongodb-memory-server.
  testTimeout: 120000,
  testMatch: ['<rootDir>/src/**/*.test.js', '<rootDir>/tests/**/*.test.js'],
};
