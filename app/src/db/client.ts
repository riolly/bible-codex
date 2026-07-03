import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

/**
 * The user DB, opened behind the Drizzle seam (ADR-0009). Drizzle is the single
 * stable query/schema boundary, so the driver (expo-sqlite today; PowerSync's
 * SQLite in Phase 4+) can be swapped without rewriting queries.
 *
 * No `directory` override → expo-sqlite uses its default app-document location,
 * which is the device-backup-included sandbox (ADR-0011, see ./paths.ts).
 */
const expo = openDatabaseSync('user.db', { enableChangeListener: true });

export const db = drizzle(expo, { schema });

export { schema };
