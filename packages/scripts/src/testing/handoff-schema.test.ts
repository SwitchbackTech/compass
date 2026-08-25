import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

describe("typed handoff ledger", () => {
  it("ships a v1 schema and in-repo /handoff write path", () => {
    expect(existsSync(".agents/handoffs/SCHEMA.md")).toBe(true);
    expect(existsSync(".agents/ledger.md")).toBe(true);
    expect(existsSync(".agents/handoffs/issue-0.md")).toBe(true);

    const schema = readFileSync(".agents/handoffs/SCHEMA.md", "utf8");
    expect(schema).toContain("schema_version");
    expect(schema).toContain(
      "`queued` | `running` | `waiting` | `verifying` | `done` | `escalated`",
    );

    const skill = readFileSync(".agents/skills/handoff/SKILL.md", "utf8");
    expect(skill).toContain(".agents/handoffs/");
    expect(skill).not.toContain("temporary directory of the user's OS");
    expect(skill).toContain("Do not fall");
  });
});
