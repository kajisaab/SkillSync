/**
 * Database Migration Runner
 * Executes SQL migration files in order
 */

const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../config/database');

const MIGRATIONS_DIR = __dirname;

/**
 * Get all migration files sorted by name
 * @returns {Promise<string[]>} Array of migration file paths
 */
async function getMigrationFiles() {
  const files = await fs.readdir(MIGRATIONS_DIR);
  const sqlFiles = files
    .filter((file) => file.endsWith('.sql'))
    .sort(); // Sort to ensure migrations run in order

  return sqlFiles.map((file) => path.join(MIGRATIONS_DIR, file));
}

/**
 * Create migrations tracking table
 */
async function createMigrationsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await pool.query(query);
  console.log('✓ Migrations tracking table ready');
}

/**
 * Check if migration has already been executed
 * @param {string} migrationName - Name of the migration file
 * @returns {Promise<boolean>} True if migration was already executed
 */
async function isMigrationExecuted(migrationName) {
  const query = 'SELECT 1 FROM schema_migrations WHERE migration_name = $1';
  const result = await pool.query(query, [migrationName]);
  return result.rows.length > 0;
}

/**
 * Record migration as executed
 * @param {string} migrationName - Name of the migration file
 */
async function recordMigration(migrationName) {
  const query = 'INSERT INTO schema_migrations (migration_name) VALUES ($1)';
  await pool.query(query, [migrationName]);
}

/**
 * Execute a single migration file
 * @param {string} filePath - Path to migration SQL file
 */
async function executeMigration(filePath) {
  const migrationName = path.basename(filePath);

  // Check if already executed
  if (await isMigrationExecuted(migrationName)) {
    console.log(`⊘ Skipping ${migrationName} (already executed)`);
    return;
  }

  console.log(`→ Executing ${migrationName}...`);

  // Read and execute SQL file
  const sql = await fs.readFile(filePath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await recordMigration(migrationName);
    await client.query('COMMIT');
    console.log(`✓ Completed ${migrationName}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`✗ Failed ${migrationName}:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Payment Service - Database Migrations');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Create migrations tracking table
    await createMigrationsTable();

    // Get all migration files
    const migrationFiles = await getMigrationFiles();

    if (migrationFiles.length === 0) {
      console.log('⊘ No migration files found');
      return;
    }

    console.log(`Found ${migrationFiles.length} migration file(s)\n`);

    // Execute each migration
    for (const filePath of migrationFiles) {
      await executeMigration(filePath);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✓ All migrations completed successfully');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('  ✗ Migration failed');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
