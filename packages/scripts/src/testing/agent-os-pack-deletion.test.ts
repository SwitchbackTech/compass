import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

describe("agent-os pack deletion", () => {
  it("removes wip/restructure and points AGENTS.md at durable replacements", () => {
    expect(existsSync("wip/restructure")).toBe(false);
    const agents = readFileSync("AGENTS.md", "utf8");
    expect(agents).not.toContain("wip/restructure/README.md");
    expect(agents).toContain(".agents/skills/README.md");
    expect(agents).toContain(".agents/handoffs/SCHEMA.md");
    expect(agents).toContain("docs/CI-CD/error-autofix-routine.md");
    expect(agents).toContain("3-agent-task.yml");
    expect(agents).toContain("WP-08 was cancelled");
  });
});
