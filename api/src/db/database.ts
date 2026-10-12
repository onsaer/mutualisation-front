import { join } from 'node:path';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema.js';
import { seed } from './seed.js';

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface DatabaseHandle {
  readonly db: Database;
  close(): Promise<void>;
}

/** Jeton d'injection Nest de la base Drizzle. */
export const DB = Symbol('DB');
export const DB_HANDLE = Symbol('DB_HANDLE');

const migrationsFolder = join(process.cwd(), 'drizzle');

/**
 * Ouvre la base et applique les migrations.
 * - Avec `DATABASE_URL` : PostgreSQL (docker compose en local, base managée en production).
 * - Sans : PGlite, un PostgreSQL embarqué en mémoire, rempli avec les données de démonstration.
 *   Pratique pour essayer l'API ou lancer les tests sans rien installer.
 */
export async function openDatabase(url = process.env['DATABASE_URL']): Promise<DatabaseHandle> {
  if (!url) {
    const { PGlite } = await import('@electric-sql/pglite');
    const { drizzle } = await import('drizzle-orm/pglite');
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    const client = new PGlite();
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder });
    await seed(db);
    return { db, close: () => client.close() };
  }
  const { Pool } = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder });
  if (process.env['SEED'] === '1') await seed(db);
  return { db, close: () => pool.end() };
}
