import { MigratorType } from "./common/cli.types";
import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { createRequire } from "node:module";

const requireActual = createRequire(import.meta.url);

const mockExitHelpfully = mock();
const mockRunMigrator = mock((): Promise<void> => Promise.resolve());
const mockRunPurgeCorrupt = mock((): Promise<void> => Promise.resolve());
const mockRunPurgeUser = mock((): Promise<void> => Promise.resolve());

mock.module("@scripts/cli.validator", () => ({
  CliValidator: mock().mockImplementation(() => ({
    exitHelpfully: mockExitHelpfully,
  })),
}));

mock.module("@scripts/commands/migrate", () => ({
  __esModule: true,
  runMigrator: mock((type: MigratorType) => mockRunMigrator(type)),
}));

mock.module("@scripts/commands/purge-corrupt-sync-events", () => ({
  __esModule: true,
  runPurgeCorruptSyncEvents: mock(() => mockRunPurgeCorrupt()),
}));
mock.module("@scripts/commands/purge-user", () => ({
  __esModule: true,
  runPurgeUser: mock(() => mockRunPurgeUser()),
}));

const { default: CompassCLI } = requireActual(
  "@scripts/cli",
) as typeof import("@scripts/cli");

describe("CompassCLI", () => {
  afterEach(() => {
    mock.restore();
  });

  it("runs migrate command and does not throw", async () => {
    const cli = new CompassCLI(["node", "cli", "migrate", "--help"]);

    await cli.run();

    expect(mockRunMigrator).toHaveBeenCalledWith(MigratorType.MIGRATION);
  });

  it("runs purge-corrupt-sync-events command", async () => {
    const cli = new CompassCLI(["node", "cli", "purge-corrupt-sync-events"]);

    await cli.run();

    expect(mockRunPurgeCorrupt).toHaveBeenCalled();
  });

  it("runs purge-user command", async () => {
    const cli = new CompassCLI(["node", "cli", "purge-user"]);

    await cli.run();

    expect(mockRunPurgeUser).toHaveBeenCalled();
  });

  it("calls exitHelpfully for unsupported command", async () => {
    const exitSpy = spyOn(process, "exit").mockImplementation(mock() as never);

    const cli = new CompassCLI(["node", "cli", "unknown"]);

    await cli.run();

    expect(mockExitHelpfully).toHaveBeenCalledWith(
      "unknown is not a supported cmd",
    );

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
