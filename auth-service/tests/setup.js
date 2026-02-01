/**
 * Jest Test Setup
 * Runs before all test suites
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.BCRYPT_ROUNDS = '4'; // Lower rounds for faster tests
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'skillsync_auth_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres_dev';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Suppress noisy console output during tests
global.console = {
  ...console,
  error: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};
