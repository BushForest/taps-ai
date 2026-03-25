import { readFileSync } from "node:fs";
import path from "node:path";
import { newDb } from "pg-mem";
import { createDbClientFromPool, nfcTags, physicalTables, restaurants } from "@taps/db";

export async function createPgMemDb() {
  const memoryDb = newDb({
    autoCreateForeignKeyIndices: true
  });
  const workspaceRoot = process.cwd();

  memoryDb.public.none(
    readFileSync(path.join(workspaceRoot, "packages/db/migrations/0001_init.sql"), "utf8")
  );
  memoryDb.public.none(
    readFileSync(path.join(workspaceRoot, "packages/db/migrations/0002_phase3_mvp_alignment.sql"), "utf8")
  );

  const { Pool } = memoryDb.adapters.createPg();
  const pool = new Pool();
  const db = createDbClientFromPool(pool);

  await db.insert(restaurants).values({
    id: "rest_demo",
    name: "Taps Demo Restaurant",
    timezone: "America/New_York",
    status: "active",
    posProvider: "memory",
    paymentProvider: "mock",
    loyaltyMode: "optional",
    publicSessionGraceMinutes: 15,
    supportRetentionDays: 30,
    configurationVersion: 1
  });

  await db.insert(physicalTables).values({
    id: "table_12",
    restaurantId: "rest_demo",
    tableCode: "12",
    displayName: "Table 12",
    serviceArea: "Main Dining"
  });

  await db.insert(nfcTags).values({
    id: "tag_table_12",
    restaurantId: "rest_demo",
    tableId: "table_12",
    tagCode: "demo-table-12",
    status: "active"
  });

  return {
    db,
    async dispose() {
      await pool.end();
    }
  };
}
