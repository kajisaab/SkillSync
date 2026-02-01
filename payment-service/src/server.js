/**
 * Payment Service Server
 * Initializes and starts the Express server
 */

const app = require('./app');
const { pool } = require('./config/database');

const PORT = process.env.PORT || 4003;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Test database connection on startup
const testDatabaseConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✓ Database connection successful');

    // Test query
    const result = await client.query('SELECT NOW()');
    console.log('✓ Database is responding:', result.rows[0].now);

    client.release();
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    return false;
  }
};

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Close database pool
  try {
    await pool.end();
    console.log('✓ Database connections closed');
  } catch (error) {
    console.error('✗ Error closing database:', error.message);
  }

  process.exit(0);
};

// Start server
const startServer = async () => {
  try {
    // Verify environment variables
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_dummy_key') {
      console.warn('⚠ STRIPE_SECRET_KEY not configured - using dummy key');
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.warn('⚠ STRIPE_WEBHOOK_SECRET not configured - webhook signature verification disabled');
    }

    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected && NODE_ENV === 'production') {
      console.error('✗ Cannot start server without database connection in production');
      process.exit(1);
    }

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  Payment Service Started');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`  Environment: ${NODE_ENV}`);
      console.log(`  Port: ${PORT}`);
      console.log(`  Health: http://localhost:${PORT}/api/health`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
