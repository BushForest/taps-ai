import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run SQL migrations.");
}

const migrationsDir = path.resolve(process.cwd(), "packages", "db", "migrations");

async function main() {
  const pool = new Pool({
    connectionString: databaseUrl
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS taps_schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationFiles = (await readdir(migrationsDir))
      .filter((filename) => filename.endsWith(".sql"))
      .sort((left, right) => left.localeCompare(right));

    if (!migrationFiles.length) {
      console.log("No SQL migration files found.");
      return;
    }

    for (const filename of migrationFiles) {
      const alreadyApplied = await pool.query<{ filename: string }>(
        "SELECT filename FROM taps_schema_migrations WHERE filename = $1 LIMIT 1",
        [filename]
      );
      if (alreadyApplied.rowCount) {
        console.log(`Skipping ${filename} (already applied).`);
        continue;
      }

      const sql = await readFile(path.join(migrationsDir, filename), "utf8");
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO taps_schema_migrations (filename) VALUES ($1)", [filename]);
        await client.query("COMMIT");
        console.log(`Applied ${filename}.`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
