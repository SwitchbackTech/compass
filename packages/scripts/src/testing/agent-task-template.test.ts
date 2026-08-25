import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

describe("agent-task issue template", () => {
  it("requires finish line, acceptance, scope, verify, approval, and untrusted input", () => {
    expect(existsSync(".github/ISSUE_TEMPLATE/3-agent-task.yml")).toBe(true);
    const yaml = readFileSync(
      ".github/ISSUE_TEMPLATE/3-agent-task.yml",
      "utf8",
    );
    expect(yaml).toContain("id: finish_line");
    expect(yaml).toContain("id: acceptance");
    expect(yaml).toContain("id: package_scope");
    expect(yaml).toContain("id: verify_commands");
    expect(yaml).toContain("id: approval_boundary");
    expect(yaml).toContain("id: handoff_path");
    expect(yaml).toContain("id: untrusted_input");
    expect(yaml).toContain("labels: [agent-ready]");
    expect(yaml).toContain(".agents/handoffs/<issue-number>.md");
    expect(yaml).toContain("untrusted input");
  });

  it("keeps bug and feature templates usable without agent fields", () => {
    const feature = readFileSync(
      ".github/ISSUE_TEMPLATE/1-feature-request.yml",
      "utf8",
    );
    const bug = readFileSync(".github/ISSUE_TEMPLATE/2-bug-report.yml", "utf8");
    expect(feature).toContain("Agent routing (optional)");
    expect(bug).toContain("Agent routing (optional)");
    expect(feature).not.toContain("id: finish_line");
    expect(bug).not.toContain("id: finish_line");
  });
});
