/**
 * Migration Entry Point
 * Calls the migration runner
 */

const { runMigrations } = require('../migrations/run-migrations');

runMigrations()
  .then(() => {
    console.log('Migration process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration process failed:', error);
    process.exit(1);
  });
