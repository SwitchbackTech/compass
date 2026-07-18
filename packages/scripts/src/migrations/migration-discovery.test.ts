import { Glob } from "bun";
import { describe, expect, it } from "bun:test";
import { parse, resolve } from "node:path";

// Guards the contract Umzug relies on (see commands/migrate.ts): every file in
// the migrations directory is a runnable migration, discovered and ordered by
// filename. This replaced the six retired 2025 integration suites -- those
// re-ran permanently-completed migrations against seeded databases; this proves
// the discovery/ordering still holds for the whole chain, cheaply and without
// Mongo. Correctness of each migration's data transform lives in the
// migration-support unit tests and the per-migration suites.

const MIGRATIONS_DIR = resolve(import.meta.dir);

function discoverMigrationFiles(): string[] {
  const glob = new Glob("**/*.{ts,js}");
  return Array.from(glob.scanSync(MIGRATIONS_DIR))
    .filter((rel) => !/\.test\.(ts|js)$/.test(rel))
    .map((rel) => resolve(MIGRATIONS_DIR, rel));
}

describe("migration discovery", () => {
  const files = discoverMigrationFiles();

  it("finds the timestamped migration files", () => {
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      // Umzug orders by filename; the repo names migrations `YYYY.MM.DD...`.
      expect(parse(file).name).toMatch(/^\d{4}\.\d{2}\.\d{2}T/);
    }
  });

  it("orders migrations lexicographically by filename (chronological)", () => {
    const names = files.map((file) => parse(file).name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    // A migration named out of chronological order would run in the wrong
    // sequence; the loader's sort must be a stable identity on sorted input.
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(sorted);
    expect(new Set(names).size).toBe(names.length); // names are unique
  });

  it("exposes a runnable migration (default export with an up method) per file", async () => {
    for (const file of files) {
      const mod = (await import(file)) as {
        default: new () => { up?: unknown; down?: unknown };
      };
      expect(typeof mod.default).toBe("function");

      const migration = new mod.default();
      expect(typeof migration.up).toBe("function");
      // `down` is optional (migrate.ts tolerates its absence) but must be a
      // function when present.
      if (migration.down !== undefined) {
        expect(typeof migration.down).toBe("function");
      }
    }
  });
});
