/**
 * Schema drift check — does the connected database actually have what the code
 * expects?
 *
 * WHY THIS EXISTS
 * This project keeps no `prisma/migrations/` directory. Schema changes ship as
 * reviewable, idempotent SQL under `prisma/sql/` (and `prisma/manual-migrations/`
 * for things Prisma cannot express), applied by hand. That works right up until
 * someone merges the code and forgets to run the SQL — and then nothing fails at
 * build time, nothing fails at deploy time, and the first thing that notices is
 * a user hitting a 500.
 *
 * That is exactly how the business panel broke: `businesses.join_code` existed in
 * schema.prisma but not in the database, and the dashboard is the one query in
 * the codebase that reads every column of `businesses`, so it threw P2022 and the
 * global error boundary took the whole panel. `blocked_businesses` was missing by
 * the same omission, which broke search and the public profile for every signed-in
 * visitor.
 *
 * A missing table or column is a deploy-blocking fact, so this exits non-zero and
 * names the SQL file that supplies what is missing.
 *
 *   pnpm db:check
 *
 * Read-only: it issues two catalogue SELECTs and no DDL.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SQL_DIRS = ["prisma/sql", "prisma/manual-migrations"];

/** Prisma's default mapping when a field carries no explicit `@map`. */
function snakeCase(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

/**
 * Which SQL file mentions this identifier?
 *
 * Derived by scanning rather than hand-maintained, so a new migration file is
 * attributed automatically and the mapping cannot go stale.
 */
function locateInSql(identifier: string): string[] {
  const found: string[] = [];
  for (const dir of SQL_DIRS) {
    let entries: string[];
    try {
      entries = readdirSync(dir).filter((f) => f.endsWith(".sql"));
    } catch {
      continue; // directory is optional
    }
    for (const file of entries) {
      const body = readFileSync(join(dir, file), "utf8");
      if (body.includes(`"${identifier}"`) || new RegExp(`\\b${identifier}\\b`).test(body)) {
        found.push(`${dir}/${file}`);
      }
    }
  }
  return found;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const tableRows = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    const columnRows = await prisma.$queryRaw<{ table_name: string; column_name: string }[]>`
      SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`;

    const tables = new Set(tableRows.map((r) => r.table_name));
    const columns = new Map<string, Set<string>>();
    for (const r of columnRows) {
      if (!columns.has(r.table_name)) columns.set(r.table_name, new Set());
      columns.get(r.table_name)!.add(r.column_name);
    }

    const missingTables: { model: string; table: string }[] = [];
    const missingColumns: { model: string; table: string; column: string; field: string }[] = [];

    for (const model of Prisma.dmmf.datamodel.models) {
      const table = model.dbName ?? model.name;
      if (!tables.has(table)) {
        missingTables.push({ model: model.name, table });
        continue; // every column is missing too; one line per table is enough
      }
      const present = columns.get(table)!;
      for (const field of model.fields) {
        // Relations are not columns; the underlying FK scalar is its own field.
        if (field.kind === "object") continue;
        const column = field.dbName ?? snakeCase(field.name);
        if (!present.has(column) && !present.has(field.name)) {
          missingColumns.push({ model: model.name, table, column, field: field.name });
        }
      }
    }

    if (missingTables.length === 0 && missingColumns.length === 0) {
      console.log(
        `✓ schema in sync — ${Prisma.dmmf.datamodel.models.length} models present in the database`
      );
      return;
    }

    console.error("✗ SCHEMA DRIFT — the database is missing objects the code reads.\n");

    const culprits = new Set<string>();
    for (const t of missingTables) {
      console.error(`  MISSING TABLE   ${t.table}   (model ${t.model})`);
      locateInSql(t.table).forEach((f) => culprits.add(f));
    }
    for (const c of missingColumns) {
      console.error(`  MISSING COLUMN  ${c.table}.${c.column}   (model ${c.model}.${c.field})`);
      locateInSql(c.column).forEach((f) => culprits.add(f));
    }

    if (culprits.size > 0) {
      console.error("\nApply these, in date order, then re-run this check:");
      for (const f of [...culprits].sort()) console.error(`  psql "$DIRECT_URL" -f ${f}`);
      console.error("\n(Or paste each file into the Supabase SQL editor.) Then: pnpm db:generate");
    } else {
      console.error("\nNo SQL file covers these — run `pnpm db:push`, or write the migration.");
    }

    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("✗ schema check could not run:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
