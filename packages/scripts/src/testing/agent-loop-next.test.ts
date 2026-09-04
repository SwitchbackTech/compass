import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";

describe("agent-loop-next picker", () => {
  it("selects non-overlapping partitions up to N and honors Depends on", () => {
    const result = spawnSync(
      "bash",
      [".github/scripts/agent-loop-next.test.sh"],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status, result.stderr + result.stdout).toBe(0);
    expect(result.stdout).toContain("Depends on open issue skips 2");
    expect(result.stdout).toContain("overlapping sync-core labels pick only");
  });
});
