import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

// Structural invariants of the error-autofix guard and prompt. Documentation
// prose lives in docs/CI-CD/error-autofix-routine.md and is not pinned here.
describe("error-autofix Routine contract", () => {
  it("ships the workflows and Routine doc", () => {
    const workflows = readFileSync("docs/CI-CD/workflows.md", "utf8");
    expect(workflows).toContain("error-autofix.yml");
    expect(workflows).toContain("error-autofix-postdeploy.yml");
    expect(workflows).toContain("error-autofix-routine.md");
    expect(existsSync("docs/CI-CD/error-autofix-routine.md")).toBe(true);
    expect(existsSync(".github/prompts/error-autofix.md")).toBe(true);
  });

  it("keeps merge-guard as the Verifier with small size rails", () => {
    const guard = readFileSync(
      ".github/scripts/autofix-merge-guard.sh",
      "utf8",
    );
    expect(guard).toContain("NO_AUTOMERGE_PATH_PATTERNS=(");
    expect(guard).toMatch(/^MAX_FILES=8$/m);
    expect(guard).toMatch(/^MAX_LINES=250$/m);
  });

  it("still blocks the sensitive paths from auto-merging", () => {
    const guard = readFileSync(
      ".github/scripts/autofix-merge-guard.sh",
      "utf8",
    );
    // Authoring a fix in these is allowed; merging one without a human is
    // not. Shrinking this list is a deliberate act, not a drive-by.
    for (const pattern of [
      "'^self-host/'",
      "'^packages/backend/src/auth/'",
      "'^packages/core/src/logger/'",
      "'^packages/backend/src/logging/'",
      "'^packages/sync/src/telemetry/'",
      "'billing'",
      "'stripe'",
    ]) {
      expect(guard).toContain(pattern);
    }
  });

  it("lets the agent author a sensitive-path fix, flagged for a human", () => {
    const prompt = readFileSync(".github/prompts/error-autofix.md", "utf8");
    // The rule this replaced ("Never edit any denied path") turned a
    // diagnosed one-line fix into a comment asking a human to write it.
    expect(prompt).not.toContain("Never edit any denied path");
    expect(prompt).toContain("never add `automerge-candidate`, in any mode");
    expect(prompt).not.toContain(".agents/handoffs");
  });
});
