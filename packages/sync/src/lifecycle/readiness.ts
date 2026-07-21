// Readiness tracking for the Compass Sync service.
//
// Liveness answers "is the process running" (always true once we respond).
// Readiness answers "are all required dependencies verified" — storage
// connectivity, index installation, scheduler, change-feed init. Later commits
// register real checks; this provides the registry and proves a failing check
// makes the service not-ready. The service must never report ready before its
// dependencies and indexes are verified.

export interface ReadinessCheckResult {
  readonly name: string;
  readonly ready: boolean;
  readonly detail?: string;
}

export interface ReadinessReport {
  readonly ready: boolean;
  readonly checks: readonly ReadinessCheckResult[];
}

// A check returns true (ready) / false (not ready), or throws — a thrown
// error is treated as not-ready with the error message as detail, so a
// dependency that blows up can never be mistaken for ready.
export type ReadinessCheck = () => boolean | Promise<boolean>;

export class ReadinessRegistry {
  private readonly checks = new Map<string, ReadinessCheck>();

  register(name: string, check: ReadinessCheck): void {
    if (this.checks.has(name)) {
      throw new Error(`Readiness check "${name}" is already registered`);
    }
    this.checks.set(name, check);
  }

  async report(): Promise<ReadinessReport> {
    const results = await Promise.all(
      [...this.checks].map(([name, check]) => runCheck(name, check)),
    );

    // With no registered checks the service is not yet ready: readiness must
    // be earned by verifying at least one dependency, never assumed.
    const ready = results.length > 0 && results.every((result) => result.ready);

    return { ready, checks: results };
  }
}

async function runCheck(
  name: string,
  check: ReadinessCheck,
): Promise<ReadinessCheckResult> {
  try {
    const ready = await check();
    return ready
      ? { name, ready: true }
      : { name, ready: false, detail: "check reported not ready" };
  } catch (error) {
    return {
      name,
      ready: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
