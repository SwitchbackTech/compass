// Graceful-shutdown coordination for the Compass Sync service (ledger S09).
//
// Registered drain tasks run in REVERSE registration order (last started,
// first stopped), so higher-level work (job claims) drains before the
// resources it depends on (storage, HTTP). Later commits register real drains:
// stop claiming new work, then complete or release in-flight leases, then
// close storage. S09 provides the ordering guarantee and proves one failing
// drain does not prevent the others from running.

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

  // Runs every registered task, in reverse order, even if some throw. Returns
  // the collected failures so the caller can log them; one broken drain must
  // never strand the resources registered before it.
  async shutdown(): Promise<ShutdownTaskError[]> {
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
