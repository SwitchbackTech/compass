import { MigratorType } from "./common/cli.types";
import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { createRequire } from "node:module";

const requireActual = createRequire(import.meta.url);

const mockExitHelpfully = mock();
const mockRunMigrator = mock((): Promise<void> => Promise.resolve());
const mockRunInventory = mock((): Promise<void> => Promise.resolve());
const mockRunMigrateConnections = mock((): Promise<void> => Promise.resolve());

mock.module("@scripts/cli.validator", () => ({
  CliValidator: mock().mockImplementation(() => ({
    exitHelpfully: mockExitHelpfully,
  })),
}));

mock.module("@scripts/commands/migrate", () => ({
  __esModule: true,
  runMigrator: mock((type: MigratorType) => mockRunMigrator(type)),
}));

mock.module("@scripts/commands/inventory-legacy-sync", () => ({
  __esModule: true,
  runInventoryLegacySync: mock(() => mockRunInventory()),
}));

mock.module("@scripts/commands/migrate-connections", () => ({
  __esModule: true,
  runMigrateConnections: mock(() => mockRunMigrateConnections()),
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

  it("runs inventory-legacy-sync command", async () => {
    const cli = new CompassCLI(["node", "cli", "inventory-legacy-sync"]);

    await cli.run();

    expect(mockRunInventory).toHaveBeenCalled();
  });

  it("runs migrate-connections command", async () => {
    const cli = new CompassCLI(["node", "cli", "migrate-connections"]);

    await cli.run();

    expect(mockRunMigrateConnections).toHaveBeenCalled();
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
