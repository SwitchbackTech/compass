import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

describe("error-autofix Routine contract", () => {
  it("lists autofix workflows and points at the Routine doc", () => {
    const workflows = readFileSync("docs/CI-CD/workflows.md", "utf8");
    expect(workflows).toContain("error-autofix.yml");
    expect(workflows).toContain("error-autofix-postdeploy.yml");
    expect(workflows).toContain("error-autofix-routine.md");
    expect(existsSync("docs/CI-CD/error-autofix-routine.md")).toBe(true);
  });

  it("documents trigger, stop, retry, verifier, and typed handoff", () => {
    const routine = readFileSync("docs/CI-CD/error-autofix-routine.md", "utf8");
    expect(routine).toContain("ROUTINE: error-autofix");
    expect(routine).toContain(
      "TRIGGER: issues opened by posthog[bot] | workflow_dispatch",
    );
    expect(routine).toContain("STOP: repo var ERROR_AUTOFIX_ENABLED");
    expect(routine).toContain(
      "RETRY: dispatch a fresh run (do not “Re-run jobs” on a failed snapshot)",
    );
    expect(routine).toContain(
      "VERIFIER: .github/scripts/autofix-merge-guard.sh",
    );
    expect(routine).toContain(".agents/handoffs/<issue-number>.md");
    expect(routine).toContain("on the PR branch");
    expect(routine).toContain("unknown / insufficient signal");
    expect(routine).toContain("last_successful_action:");
    expect(routine).toContain("documented, not run");

    const prompt = readFileSync(".github/prompts/error-autofix.md", "utf8");
    expect(prompt).toContain(".agents/handoffs/<issue-number>.md");
    expect(prompt).toContain("on the PR branch");
  });

  it("keeps merge-guard as the Verifier with unchanged size rails", () => {
    const guard = readFileSync(
      ".github/scripts/autofix-merge-guard.sh",
      "utf8",
    );
    expect(guard).toContain("DENIED_PATH_PATTERNS=(");
    expect(guard).toMatch(/^MAX_FILES=8$/m);
    expect(guard).toMatch(/^MAX_LINES=250$/m);

    const routine = readFileSync("docs/CI-CD/error-autofix-routine.md", "utf8");
    expect(routine).toContain("MAX_FILES=8");
    expect(routine).toContain("MAX_LINES=250");
    expect(routine).toContain("DENIED_PATH_PATTERNS");
    expect(routine).toContain("do not widen from this doc");
  });
});
