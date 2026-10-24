import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";

describe("live-provider-smoke expected providers", () => {
  it("fails when an expected provider lacks creds and skips others", () => {
    const result = spawnSync(
      "bash",
      [".github/scripts/live-provider-smoke.test.sh"],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status, result.stderr + result.stdout).toBe(0);
    expect(result.stdout).toContain("expected missing creds exits 1");
    expect(result.stdout).toContain(
      "expected ready providers exit 0 when bun passes",
    );
    expect(result.stdout).toContain("nothing expected and all skipped exits 0");
  });
});
