import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";

describe("live-provider-smoke missing credentials", () => {
  it("fails when credentials are absent and runs bun when ready", () => {
    const result = spawnSync(
      "bash",
      [".github/scripts/live-provider-smoke.test.sh"],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status, result.stderr + result.stdout).toBe(0);
    expect(result.stdout).toContain("all missing creds exits 1");
    expect(result.stdout).toContain(
      "partial ready exits 1 when any provider failed",
    );
    expect(result.stdout).toContain("all ready exits 0 when bun passes");
  });
});
