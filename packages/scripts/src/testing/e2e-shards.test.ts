import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const WORKFLOW = ".github/workflows/test-e2e.yml";

/** `specs:` values from the e2e-shard matrix, one array per shard. */
function shardSpecLists(): string[][] {
  const workflow = readFileSync(WORKFLOW, "utf8");
  return [...workflow.matchAll(/^\s+specs:\s*(.+)$/gm)].map((match) =>
    (match[1] ?? "").trim().split(/\s+/),
  );
}

/** Top-level `e2e/<dir>` directories that contain at least one spec file. */
function specDirectories(): string[] {
  return readdirSync("e2e")
    .filter((name) => statSync(join("e2e", name)).isDirectory())
    .filter((name) =>
      readdirSync(join("e2e", name)).some((file) => file.endsWith(".spec.ts")),
    )
    .map((name) => `e2e/${name}`)
    .sort();
}

// The e2e workflow assigns spec directories to shards by hand, sized from
// measured durations, instead of letting Playwright split by test count.
// The price of a hand list is that a new directory could silently never run
// in CI. This test is that price.
describe("e2e shard assignment", () => {
  it("assigns every e2e directory with specs to exactly one shard", () => {
    const lists = shardSpecLists();
    expect(lists.length).toBeGreaterThan(1);

    const assigned = lists.flat().sort();
    expect(assigned).toEqual(specDirectories());
  });

  it("passes the spec list to playwright as file filters", () => {
    const workflow = readFileSync(WORKFLOW, "utf8");
    expect(workflow).toContain("bunx playwright test $SPECS");
    expect(workflow).toContain("SPECS: ${{ matrix.specs }}");
    expect(workflow).not.toMatch(/playwright test [^\n]*--shard/);
  });
});
