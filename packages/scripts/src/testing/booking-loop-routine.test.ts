import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

describe("booking-loop Routine contract", () => {
  it("lists the booking-loop workflow and points at the Routine doc", () => {
    const workflows = readFileSync("docs/CI-CD/workflows.md", "utf8");
    expect(workflows).toContain("booking-loop.yml");
    expect(workflows).toContain("booking-loop-routine.md");
    expect(existsSync("docs/CI-CD/booking-loop-routine.md")).toBe(true);
    expect(existsSync(".github/workflows/booking-loop.yml")).toBe(true);
    expect(existsSync(".github/prompts/booking-loop.md")).toBe(true);
    expect(existsSync(".agents/skills/booking-loop/SKILL.md")).toBe(true);
    expect(existsSync("wip/booking/AUTOMATION.md")).toBe(true);
  });

  it("documents trigger, stop, retry, verifier, dual-launch, and staging", () => {
    const routine = readFileSync("docs/CI-CD/booking-loop-routine.md", "utf8");
    expect(routine).toContain("ROUTINE: booking-loop");
    expect(routine).toContain(
      "TRIGGER: workflow_dispatch | hourly cron | Release on main completed",
    );
    expect(routine).toContain("STOP: repo var BOOKING_LOOP_ENABLED");
    expect(routine).toContain(
      "RETRY: dispatch a fresh run (do not “Re-run jobs” on a failed snapshot)",
    );
    expect(routine).toContain(
      "VERIFIER: .github/scripts/booking-loop-merge-guard.sh",
    );
    expect(routine).toContain(".agents/handoffs/<issue-number>.md");
    expect(routine).toContain("on the PR branch");
    expect(routine).toContain("booking-loop: pickup");
    expect(routine).toContain("https://api.cursor.com/v0/agents");
    expect(routine).toContain("Never both");
    expect(routine).toContain("https://staging.compasscalendar.com");
    expect(routine).toContain("enter credentials");
    expect(routine).toContain("last_successful_action:");
    expect(routine).toContain("documented, not run");

    const prompt = readFileSync(".github/prompts/booking-loop.md", "utf8");
    expect(prompt).toContain(".agents/handoffs/<issue-number>.md");
    expect(prompt).toContain("on the PR branch");
    expect(prompt).toContain("booking-automerge");
    expect(prompt).toContain("Never enter credentials");
  });

  it("keeps merge-guard as the Verifier with booking-sized rails", () => {
    const guard = readFileSync(
      ".github/scripts/booking-loop-merge-guard.sh",
      "utf8",
    );
    expect(guard).toContain("NO_AUTOMERGE_PATH_PATTERNS=(");
    expect(guard).toContain("MAX_FILES=${BOOKING_LOOP_MAX_FILES:-60}");
    expect(guard).toContain("MAX_LINES=${BOOKING_LOOP_MAX_LINES:-4000}");

    const routine = readFileSync("docs/CI-CD/booking-loop-routine.md", "utf8");
    expect(routine).toContain("MAX_FILES=60");
    expect(routine).toContain("MAX_LINES=4000");
    expect(routine).toContain("NO_AUTOMERGE_PATH_PATTERNS");
    expect(routine).toContain("do not widen from this doc");
  });

  it("still blocks the sensitive paths from auto-merging", () => {
    const guard = readFileSync(
      ".github/scripts/booking-loop-merge-guard.sh",
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
    const launch = readFileSync(
      ".github/scripts/booking-loop-launch.sh",
      "utf8",
    );
    expect(launch).toContain("https://api.cursor.com/v0/agents");
    expect(launch).toContain("booking-loop: pickup");
    expect(launch).toContain('if [ -n "${CURSOR_API_KEY:-}" ]');
    expect(launch).toContain("Not commenting");
    expect(launch).toContain("dual-launch");

    const workflow = readFileSync(".github/workflows/booking-loop.yml", "utf8");
    expect(workflow).toContain("vars.BOOKING_LOOP_ENABLED == 'true'");
    expect(workflow).toContain("group: booking-loop");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain("booking-loop-merge-guard.sh");
    expect(workflow).toContain("booking-loop-postdeploy.sh");
    expect(workflow).toContain("booking-loop-next.sh");
    expect(workflow).toContain("booking-loop-launch.sh");
  });

  it("smokes staging without logging in", () => {
    const smoke = readFileSync(
      ".github/scripts/booking-loop-staging-smoke.sh",
      "utf8",
    );
    expect(smoke).toContain("https://staging.compasscalendar.com");
    expect(smoke).toContain("/book/");
    expect(smoke).not.toContain("password");
    expect(smoke).not.toContain("oauth");
    expect(smoke).toContain("Never logs in");
  });
});
