// Dependency-drain coordination for the Compass Sync service.
//
// This coordinator drains BACKGROUND DEPENDENCIES only — job-claim workers,
// schedulers, and storage clients registered by later commits. It runs tasks
// in REVERSE registration order so higher-level work (job claims) drains
// before the storage it depends on: startup acquires storage first, then
// starts workers, so LIFO teardown stops workers first and closes storage
// last: it stops claims before it closes the storage they depend on.
//
// The HTTP listener is deliberately NOT a task here. Stopping the front door
// must happen FIRST (before dependencies drain), so `createSyncService`
// closes the HTTP server as an explicit first phase, ahead of this coordinator
// (see app.ts `stop`).

export type ShutdownTask = () => void | Promise<void>;

export interface ShutdownTaskError {
  readonly name: string;
  readonly error: unknown;
}

export class ShutdownCoordinator {
  private readonly tasks: Array<{ name: string; task: ShutdownTask }> = [];
  private shuttingDown = false;

  register(name: string, task: ShutdownTask): void {
    this.tasks.push({ name, task });
  }

  get isShuttingDown(): boolean {
    return this.shuttingDown;
  }

  // Runs every registered task once, in reverse order, even if some throw.
  // Idempotent: a second call is a no-op returning no errors, so a repeated
  // signal or a double stop() never re-runs a non-idempotent drain (e.g.
  // closing a Mongo client twice).
  async shutdown(): Promise<ShutdownTaskError[]> {
    if (this.shuttingDown) return [];
    this.shuttingDown = true;

    const errors: ShutdownTaskError[] = [];
    for (const { name, task } of [...this.tasks].reverse()) {
      try {
        await task();
      } catch (error) {
        errors.push({ name, error });
      }
    }

    return errors;
  }
}
