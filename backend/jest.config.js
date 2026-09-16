// Force tests to use isolated test database so development data is NEVER wiped
process.env.DATABASE_URL = 'file:./test.db';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
