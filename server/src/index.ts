import { existsSync } from 'node:fs';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { openDatabase } from './db/database.js';
import { seedSampleExpenses } from './db/seed.js';

const config = loadConfig();
const isNewDatabase = config.dbPath === ':memory:' || !existsSync(config.dbPath);
const db = openDatabase(config.dbPath);
if (isNewDatabase) {
  seedSampleExpenses(db);
}

createApp(db).listen(config.apiPort, () => {
  console.log(`Spendly API listening on http://localhost:${config.apiPort}/api/v1 (db: ${config.dbPath})`);
});
