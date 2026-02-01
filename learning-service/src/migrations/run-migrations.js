/**
 * Database Migration Runner
 * Runs SQL migration files in order
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const MIGRATIONS_DIR = __dirname;

/**
 * Get all migration files sorted by name
 */
const getMigrationFiles = () => {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  return files;
};

/**
 * Run a single migration file
 */
const runMigration = async (filename) => {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filePath, 'utf8');

  console.log(`Running migration: ${filename}`);

  try {
    await pool.query(sql);
    console.log(`✓ Successfully ran migration: ${filename}`);
  } catch (error) {
    console.error(`✗ Failed to run migration: ${filename}`);
    throw error;
  }
};

/**
 * Run all migrations
 */
const runMigrations = async () => {
  try {
    console.log('Starting database migrations...\n');

    const migrationFiles = getMigrationFiles();

    if (migrationFiles.length === 0) {
      console.log('No migration files found');
      return;
    }

    for (const file of migrationFiles) {
      await runMigration(file);
    }

    console.log('\n✓ All migrations completed successfully');
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };
