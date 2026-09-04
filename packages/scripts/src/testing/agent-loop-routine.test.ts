import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

// Structural invariants of the agent-loop scripts and workflow. Each one
// encodes an incident (see docs/CI-CD/loop-velocity-2026-09-03.md); none pin
// documentation prose, which lives in docs/CI-CD/agent-loop-routine.md.
describe("agent-loop Routine contract", () => {
  it("ships the workflow, prompt, Routine doc, and scripts", () => {
    expect(existsSync("docs/CI-CD/agent-loop-routine.md")).toBe(true);
    expect(existsSync(".github/workflows/agent-loop.yml")).toBe(true);
    expect(existsSync(".github/prompts/agent-loop.md")).toBe(true);
    const workflows = readFileSync("docs/CI-CD/workflows.md", "utf8");
    expect(workflows).toContain("agent-loop.yml");
    expect(workflows).toContain("agent-loop-routine.md");
  });

  it("enables GitHub auto-merge instead of holding a runner on CI", () => {
    const guard = readFileSync(
      ".github/scripts/agent-loop-merge-guard.sh",
      "utf8",
    );
    expect(guard).toContain("NO_AUTOMERGE_PATH_PATTERNS=(");
    expect(guard).toContain("--auto --squash --delete-branch");
    expect(guard).not.toContain("gh pr checks");
    expect(guard).toContain("main_is_red");
    expect(guard).toContain("--disable-auto");
  });

  it("still blocks the sensitive paths from auto-merging", () => {
    const guard = readFileSync(
      ".github/scripts/agent-loop-merge-guard.sh",
      "utf8",
    );
    for (const pattern of [
      "'^self-host/'",
      "'^packages/backend/src/auth/'",
      "'^packages/web/src/auth/'",
      "'^packages/web/src/supertokens\\.ts$'",
      "'^packages/core/src/config/'",
      "'billing'",
      "'stripe'",
    ]) {
      expect(guard).toContain(pattern);
    }
  });

  it("launches the next WP on merge with per-job concurrency", () => {
    const workflow = readFileSync(".github/workflows/agent-loop.yml", "utf8");
    expect(workflow).toContain("github.event.pull_request.merged == true");
    expect(workflow).toContain(
      "group: agent-merge-${{ github.event.pull_request.number }}",
    );
    // A workflow-level group once queued every merge-guard behind every
    // launch and cancelled 56 runs in a day.
    expect(workflow).not.toMatch(/^concurrency:/m);
    expect(workflow).toContain("cancel-in-progress: false");
    const postdeploy = readFileSync(
      ".github/scripts/agent-loop-postdeploy.sh",
      "utf8",
    );
    expect(postdeploy).not.toContain("launch_next");
  });

  it("launches via Cursor API or pickup comment, never both", () => {
    const launch = readFileSync(".github/scripts/agent-loop-launch.sh", "utf8");
    expect(launch).toContain("https://api.cursor.com/v0/agents");
    expect(launch).toContain("agent-loop: pickup");
    expect(launch).toContain(`if [ -n "\${CURSOR_API_KEY:-}" ]`);
    expect(launch).toContain('if [ "$http_code" = "429" ]');
    const next = readFileSync(".github/scripts/agent-loop-next.sh", "utf8");
    expect(next).toContain("is_human_approval");
    expect(next).toContain("has_open_dependency");
  });

  it("smokes staging without logging in", () => {
    const smoke = readFileSync(
      ".github/scripts/agent-loop-staging-smoke.sh",
      "utf8",
    );
    expect(smoke).toContain("https://staging.compasscalendar.com");
    expect(smoke).not.toContain("password");
    expect(smoke).not.toContain("oauth");
  });
});
