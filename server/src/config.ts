import { fileURLToPath } from 'node:url';

export interface Config {
  apiPort: number;
  /** SQLite file path, or ":memory:". */
  dbPath: string;
}

const defaultDbPath = fileURLToPath(new URL('../data/spendly.db', import.meta.url));

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    apiPort: Number(env.API_PORT ?? 5102),
    dbPath: env.DB_PATH ?? defaultDbPath,
  };
}
