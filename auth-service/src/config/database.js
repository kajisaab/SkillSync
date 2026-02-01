/**
 * PostgreSQL Database Configuration
 * Connection pool for Auth Service database
 */

const { Pool } = require('pg');

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'skillsync_auth',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,

  // Connection pool settings
  max: 20, // Maximum connections in pool
  min: 2,  // Minimum connections
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection fails

  // Keep connections alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

// Create connection pool
const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Handle connection events
pool.on('connect', (client) => {
  console.log('Database client connected');
});

pool.on('remove', (client) => {
  console.log('Database client removed');
});

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✓ Database connection successful:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    return false;
  }
};

/**
 * Execute a query with connection from pool
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>}
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.LOG_LEVEL === 'debug') {
      console.log('Executed query', { text, duration, rows: result.rowCount });
    }

    return result;
  } catch (error) {
    console.error('Query error:', { text, error: error.message });
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise<PoolClient>}
 */
const getClient = async () => {
  return await pool.connect();
};

/**
 * Close all connections in the pool
 * @returns {Promise<void>}
 */
const closePool = async () => {
  try {
    await pool.end();
    console.log('Database pool closed');
  } catch (error) {
    console.error('Error closing database pool:', error.message);
    throw error;
  }
};

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  closePool,
};
