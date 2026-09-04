import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

describe("agent instruction surface", () => {
  it("keeps temporary work packs and handoff ledgers out of the repo", () => {
    // Completed packs (wip/restructure, wip/attendee-support) were deleted.
    // The write-only handoff directory was deleted too, but it is not
    // asserted here: loop sessions launched before the prompts changed may
    // still add a file, and the nightly cleanup removes stragglers.
    expect(existsSync("wip")).toBe(false);
    expect(existsSync(".agents/ledger.md")).toBe(false);
  });

  it("loads one instruction file for every harness", () => {
    expect(readFileSync("CLAUDE.md", "utf8").trim()).toBe("@AGENTS.md");
    const agents = readFileSync("AGENTS.md", "utf8");
    expect(agents).toContain(".agents/skills/README.md");
    expect(agents).toContain("docs/CI-CD/agent-loop-routine.md");
    expect(agents).toContain("docs/CI-CD/error-autofix-routine.md");
    expect(agents).toContain("3-agent-task.yml");
    expect(agents).not.toContain("wip/");
    expect(agents).not.toContain(".agents/handoffs");
    expect(agents.split(/\s+/).length).toBeLessThan(700);
  });
});
