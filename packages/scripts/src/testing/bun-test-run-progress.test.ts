import {
  bunTestRunExitCode,
  bunTestRunLooksFinished,
  createBunTestRunProgress,
  ingestBunTestOutput,
} from "./bun-test-run-progress";
import { describe, expect, it } from "bun:test";

describe("ingestBunTestOutput", () => {
  it("treats a green run with no summary as finished and passing", () => {
    const progress = createBunTestRunProgress();
    ingestBunTestOutput(
      [
        "packages/scripts/src/commands/purge-user.db.test.ts:",
        "(pass) purge-user (db) > dry-run reports counts without deleting anything [101.94ms]",
        "(pass) purge-user (db) > normalizes the email before matching [21.76ms]",
      ].join("\n"),
      progress,
    );

    expect(progress.sawPass).toBe(true);
    expect(progress.sawSummary).toBe(false);
    expect(progress.failed).toBe(0);
    expect(bunTestRunLooksFinished(progress)).toBe(true);
    expect(bunTestRunExitCode(progress)).toBe(0);
  });

  it("records the summary and fail count when Bun does exit cleanly", () => {
    const progress = createBunTestRunProgress();
    ingestBunTestOutput(
      ["(pass) example [1ms]", "1 fail", "Ran 12 tests across 17 files."].join(
        "\n",
      ),
      progress,
    );

    expect(progress.sawSummary).toBe(true);
    expect(progress.failed).toBe(1);
    expect(bunTestRunExitCode(progress)).toBe(1);
  });

  it("counts per-test (fail) lines when the summary never appears", () => {
    const progress = createBunTestRunProgress();
    ingestBunTestOutput("(pass) ok [1ms]\n(fail) broken [2ms]\n", progress);

    expect(progress.sawPass).toBe(true);
    expect(progress.failed).toBe(1);
    expect(bunTestRunLooksFinished(progress)).toBe(true);
    expect(bunTestRunExitCode(progress)).toBe(1);
  });

  it("does not treat silence with no tests as finished", () => {
    const progress = createBunTestRunProgress();
    ingestBunTestOutput(
      "Running ./packages/scripts/src (scripts)...\n",
      progress,
    );

    expect(bunTestRunLooksFinished(progress)).toBe(false);
    expect(bunTestRunExitCode(progress)).toBe(0);
  });
});
