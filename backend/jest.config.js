module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetModules: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
    'routes/**/*.js',
    '!**/node_modules/**',
  ],
  coverageReporters: ['text', 'text-summary', 'lcov', 'clover'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  // Enable parallel execution for both unit and integration tests.
  // Each integration suite manages its own unique DB instance,
  // making them completely isolated and safe to run in parallel.
  projects: [
    {
      displayName: 'unit',
      testMatch: [
        '**/tests/auth/**/*.test.js',
        '**/tests/products/**/*.test.js',
        '**/tests/orders/**/*.test.js',
        '**/tests/middleware/**/*.test.js',
      ],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      testTimeout: 60000,
    },
    {
      displayName: 'integration',
      testMatch: ['**/tests/integration/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      testTimeout: 60000,
    },
  ],
};
