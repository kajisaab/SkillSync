/**
 * Jest Test Setup
 * Global setup and configuration for tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.DB_NAME = 'skillsync_learning_test';
process.env.COURSE_SERVICE_URL = 'http://localhost:3002/api';
process.env.AUTH_SERVICE_URL = 'http://localhost:3001/api';

// Set longer timeout for integration tests
jest.setTimeout(10000);
