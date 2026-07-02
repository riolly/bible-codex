import type { Config } from 'drizzle-kit';

// Generates SQL migrations bundled as strings for expo-sqlite (ADR-0009).
// `drizzle-kit generate` writes ./src/db/migrations/*.sql + migrations.js, which
// the app imports and applies with `useMigrations`.
export default {
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
} satisfies Config;
