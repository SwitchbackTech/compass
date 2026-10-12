import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("check-prosemirror-dedupe", () => {
  it("flags more than one installed prosemirror-model version", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pm-dedupe-"));
    const store = join(dir, "node_modules/.bun");
    for (const version of ["1.25.11", "1.25.12"]) {
      const base = join(
        store,
        `prosemirror-model@${version}/node_modules/prosemirror-model`,
      );
      mkdirSync(base, { recursive: true });
      writeFileSync(
        join(base, "package.json"),
        JSON.stringify({ name: "prosemirror-model", version }),
      );
    }

    const checker = join(import.meta.dir, "check-prosemirror-dedupe.ts");
    const proc = Bun.spawnSync({
      cmd: ["bun", checker],
      cwd: dir,
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(proc.exitCode).toBe(1);
    expect(proc.stderr.toString()).toContain("multiple prosemirror-model");
  });
});
