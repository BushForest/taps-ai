import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/core";

export type TapsDbSchema = typeof schema;
export type TapsDbClient = NodePgDatabase<TapsDbSchema>;

export function createDbClient(databaseUrl: string): TapsDbClient {
  const pool = new Pool({
    connectionString: databaseUrl
  });

  return createDbClientFromPool(pool);
}

export function createDbClientFromPool(pool: Pool): TapsDbClient {
  return drizzle(pool, { schema });
}
