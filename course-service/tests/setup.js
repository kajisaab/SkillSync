/**
 * Jest Test Setup
 * Global setup and configuration for tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.DB_NAME = 'skillsync_course_test';
process.env.REDIS_DB = '15'; // Use separate Redis DB for tests

// Set longer timeout for integration tests
jest.setTimeout(10000);

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
