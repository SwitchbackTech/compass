import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

describe("agent-loop Routine contract", () => {
  it("lists the agent-loop workflow and points at the Routine doc", () => {
    const workflows = readFileSync("docs/CI-CD/workflows.md", "utf8");
    expect(workflows).toContain("agent-loop.yml");
    expect(workflows).toContain("agent-loop-routine.md");
    expect(existsSync("docs/CI-CD/agent-loop-routine.md")).toBe(true);
    expect(existsSync(".github/workflows/agent-loop.yml")).toBe(true);
    expect(existsSync(".github/prompts/agent-loop.md")).toBe(true);
    expect(existsSync(".agents/skills/booking-loop/SKILL.md")).toBe(true);
  });

  it("documents trigger, stop, retry, verifier, dual-launch, and staging", () => {
    const routine = readFileSync("docs/CI-CD/agent-loop-routine.md", "utf8");
    expect(routine).toContain("ROUTINE: agent-loop");
    expect(routine).toContain(
      "TRIGGER: workflow_dispatch | */15 cron | Release on main completed",
    );
    expect(routine).toContain("STOP: repo var AGENT_LOOP_ENABLED");
    expect(routine).toContain("AGENT_LOOP_MILESTONES");
    expect(routine).toContain(
      "RETRY: HTTP 429 waits for credits and retries on the 15-minute watchdog",
    );
    expect(routine).toContain(
      "VERIFIER: .github/scripts/agent-loop-merge-guard.sh",
    );
    expect(routine).toContain(".agents/handoffs/<issue-number>.md");
    expect(routine).toContain("on the PR branch");
    expect(routine).toContain("agent-loop: pickup");
    expect(routine).toContain("https://api.cursor.com/v0/agents");
    expect(routine).toContain("Never both");
    expect(routine).toContain("https://staging.compasscalendar.com");
    expect(routine).toContain("enter credentials");
    expect(routine).toContain("last_successful_action:");
    expect(routine).toContain("documented, not run");

    const prompt = readFileSync(".github/prompts/agent-loop.md", "utf8");
    expect(prompt).toContain(".agents/handoffs/<issue-number>.md");
    expect(prompt).toContain("on the PR branch");
    expect(prompt).toContain("agent-automerge");
    expect(prompt).toContain("Never enter credentials");
  });

  it("keeps merge-guard as the Verifier with booking-sized rails", () => {
    const guard = readFileSync(
      ".github/scripts/agent-loop-merge-guard.sh",
      "utf8",
    );
    expect(guard).toContain("NO_AUTOMERGE_PATH_PATTERNS=(");
    expect(guard).toContain(
      `MAX_FILES=\${AGENT_LOOP_MAX_FILES:-\${BOOKING_LOOP_MAX_FILES:-60}}`,
    );
    expect(guard).toContain(
      `MAX_LINES=\${AGENT_LOOP_MAX_LINES:-\${BOOKING_LOOP_MAX_LINES:-4000}}`,
    );

    const routine = readFileSync("docs/CI-CD/agent-loop-routine.md", "utf8");
    expect(routine).toContain("MAX_FILES=60");
    expect(routine).toContain("MAX_LINES=4000");
    expect(routine).toContain("NO_AUTOMERGE_PATH_PATTERNS");
    expect(routine).toContain("do not widen from this doc");
  });

  it("enables GitHub auto-merge instead of holding a runner on CI", () => {
    const guard = readFileSync(
      ".github/scripts/agent-loop-merge-guard.sh",
      "utf8",
    );
    expect(guard).toContain("--auto --squash --delete-branch");
    expect(guard).not.toContain("gh pr checks");
    expect(guard).toContain("main_is_red");
    expect(guard).toContain("--disable-auto");
  });

  it("launches the next WP on merge with per-job concurrency", () => {
    const workflow = readFileSync(".github/workflows/agent-loop.yml", "utf8");
    expect(workflow).toContain("github.event.pull_request.merged == true");
    expect(workflow).toContain(
      "group: agent-merge-${{ github.event.pull_request.number }}",
    );
    expect(workflow).not.toMatch(/^concurrency:/m);
    const postdeploy = readFileSync(
      ".github/scripts/agent-loop-postdeploy.sh",
      "utf8",
    );
    expect(postdeploy).not.toContain("launch_next");
  });

  it("still blocks the sensitive paths from auto-merging", () => {
    const guard = readFileSync(
      ".github/scripts/agent-loop-merge-guard.sh",
      "utf8",
    );
    for (const pattern of [
      "'^\\.github/'",
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

  it("launches via Cursor API or pickup comment, never both", () => {
    const launch = readFileSync(".github/scripts/agent-loop-launch.sh", "utf8");
    expect(launch).toContain("https://api.cursor.com/v0/agents");
    expect(launch).toContain("agent-loop: pickup");
    expect(launch).toContain(`if [ -n "\${CURSOR_API_KEY:-}" ]`);
    expect(launch).toContain("Not commenting");
    expect(launch).toContain("dual-launch");
    expect(launch).toContain('if [ "$http_code" = "429" ]');
    const helpers = readFileSync(".github/scripts/agent-loop-lib.sh", "utf8");
    expect(helpers).toContain("agent-loop-waiting-for-credits");
    expect(launch).toContain("QUOTA_RETRY_MARKER");

    const next = readFileSync(".github/scripts/agent-loop-next.sh", "utf8");
    expect(next).toContain("QUOTA_WAITING_LABEL");
    expect(next).toContain("waiting for Cursor credits");
    expect(next).toContain("READY_LABEL");
    expect(next).toContain("is_human_approval");
    expect(next).toContain("has_open_dependency");
    expect(next).toContain("AGENT_LOOP_CONCURRENCY");
    expect(next).toContain("PARTITION_LABELS");
    expect(next).toContain("issue_numbers");

    const workflow = readFileSync(".github/workflows/agent-loop.yml", "utf8");
    expect(workflow).toContain("vars.BOOKING_LOOP_ENABLED == 'true'");
    expect(workflow).toContain("vars.AGENT_LOOP_ENABLED == 'true'");
    expect(workflow).toContain("group: agent-loop");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain('cron: "*/15 * * * *"');
    expect(workflow).toContain("agent-loop-merge-guard.sh");
    expect(workflow).toContain("agent-loop-postdeploy.sh");
    expect(workflow).toContain("agent-loop-next.sh");
    expect(workflow).toContain("agent-loop-launch.sh");
    expect(workflow).toContain("AGENT_LOOP_CONCURRENCY");
    expect(workflow).toContain("steps.next.outputs.issue_numbers");

    const unit = readFileSync(".github/workflows/test-unit.yml", "utf8");
    const e2e = readFileSync(".github/workflows/test-e2e.yml", "utf8");
    const routine = readFileSync("docs/CI-CD/agent-loop-routine.md", "utf8");
    expect(unit).toMatch(/^ {2}merge_group:$/m);
    expect(e2e).toMatch(/^ {2}merge_group:$/m);
    expect(routine).toContain("grouping_strategy:");
    expect(routine).toContain("ALLGREEN");
  });

  it("smokes staging without logging in", () => {
    const smoke = readFileSync(
      ".github/scripts/agent-loop-staging-smoke.sh",
      "utf8",
    );
    expect(smoke).toContain("https://staging.compasscalendar.com");
    expect(smoke).toContain("/book/");
    expect(smoke).not.toContain("password");
    expect(smoke).not.toContain("oauth");
    expect(smoke).toContain("Never logs in");
  });
});
