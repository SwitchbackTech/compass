/**
 * Parse `bun test` stdout/stderr enough to decide whether a wedged worker
 * leaked after a green run (treat as pass) or never finished (fail).
 *
 * The runner in test-mongo-env.ts used to wait for "Ran N tests across M files"
 * before killing a leaked Mongo handle. Bun only prints that summary after every
 * worker exits, so a leak prevents the summary and the old watchdog failed a
 * fully green scripts suite after four minutes.
 */
export type BunTestRunProgress = {
  failed: number;
  sawPass: boolean;
  sawSummary: boolean;
};

export function createBunTestRunProgress(): BunTestRunProgress {
  return { failed: 0, sawPass: false, sawSummary: false };
}

export function ingestBunTestOutput(
  text: string,
  progress: BunTestRunProgress,
): void {
  for (const line of text.split(/\r?\n/)) {
    if (/\(pass\)/.test(line)) {
      progress.sawPass = true;
    }
    if (/\(fail\)/.test(line) || /\(error\)/.test(line)) {
      progress.failed += 1;
    }
    const failCount = line.match(/^\s*(\d+) (fail|error)s?$/);
    if (failCount) {
      progress.failed += Number(failCount[1]);
    }
    if (/^Ran \d+ tests? across \d+ files?\./.test(line)) {
      progress.sawSummary = true;
    }
  }
}

/** Exit code to use when killing a `bun test` that will not exit on its own. */
export function bunTestRunExitCode(progress: BunTestRunProgress): 0 | 1 {
  return progress.failed > 0 ? 1 : 0;
}

/**
 * True when output shows the suite finished enough to treat a subsequent
 * hang as a leaked worker rather than a stuck test that never started.
 */
export function bunTestRunLooksFinished(progress: BunTestRunProgress): boolean {
  return progress.sawSummary || progress.sawPass;
}
