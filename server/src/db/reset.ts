import { rmSync } from 'node:fs';
import { loadConfig } from '../config.js';
import { openDatabase } from './database.js';
import { seedSampleExpenses } from './seed.js';

const { dbPath } = loadConfig();
if (dbPath !== ':memory:') {
  rmSync(dbPath, { force: true });
}
const db = openDatabase(dbPath);
seedSampleExpenses(db);
db.close();
console.log(`Database reset: ${dbPath}`);
