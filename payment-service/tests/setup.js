/**
 * Jest Test Setup
 * Global setup and configuration for tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.DB_NAME = 'skillsync_payment_test';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake_secret';
process.env.COURSE_SERVICE_URL = 'http://localhost:3002/api';
process.env.LEARNING_SERVICE_URL = 'http://localhost:3003/api';

// Set longer timeout for integration tests
jest.setTimeout(10000);
