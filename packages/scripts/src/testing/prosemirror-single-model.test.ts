import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../../..");

describe("prosemirror-model dedupe", () => {
  it("resolves a single prosemirror-model version in bun.lock", () => {
    const lock = readFileSync(join(repoRoot, "bun.lock"), "utf8");
    const versions = new Set(
      [...lock.matchAll(/"prosemirror-model@([^"]+)"/g)].map((m) => m[1]),
    );

    // Multiple copies make Fragment.from throw "multiple versions of
    // prosemirror-model were loaded" in the editor.
    expect([...versions]).toHaveLength(1);
  });

  it("pins prosemirror-model in overrides and resolutions", () => {
    const pkg = JSON.parse(
      readFileSync(join(repoRoot, "package.json"), "utf8"),
    ) as {
      overrides: Record<string, string>;
      resolutions: Record<string, string>;
    };

    expect(pkg.overrides["prosemirror-model"]).toBeDefined();
    expect(pkg.resolutions["prosemirror-model"]).toBe(
      pkg.overrides["prosemirror-model"],
    );
  });
});
