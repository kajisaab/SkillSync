/**
 * Migration Generator Script
 * Creates a new SQL migration file with a timestamp prefix.
 *
 * Usage:
 *   npm run migration:generate <path/name>
 *
 * Examples:
 *   npm run migration:generate src/migrations/initial_migration
 *   npm run migration:generate src/migrations/add_users_table
 */

const fs = require('fs');
const path = require('path');

const arg = process.argv[2];

if (!arg) {
  console.error('Usage: npm run migration:generate <directory/migration_name>');
  console.error('Example: npm run migration:generate src/migrations/initial_migration');
  process.exit(1);
}

const resolvedPath = path.resolve(arg);
const dir = path.dirname(resolvedPath);
const name = path.basename(resolvedPath);

// Create directory if it doesn't exist
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`Created directory: ${dir}`);
}

// Generate timestamp prefix (YYYYMMDDHHMMSS)
const now = new Date();
const timestamp = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
  String(now.getHours()).padStart(2, '0'),
  String(now.getMinutes()).padStart(2, '0'),
  String(now.getSeconds()).padStart(2, '0'),
].join('');

const fileName = `${timestamp}_${name}.sql`;
const filePath = path.join(dir, fileName);

const template = `-- Migration: ${name}
-- Created at: ${now.toISOString()}

-- Write your migration SQL here
`;

fs.writeFileSync(filePath, template);
console.log(`Migration created: ${filePath}`);
