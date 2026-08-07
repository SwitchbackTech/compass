import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { createRequire } from "node:module";

const requireActual = createRequire(import.meta.url);

const mockExitHelpfully = mock();
const mockRunPurgeUser = mock((): Promise<void> => Promise.resolve());

mock.module("@scripts/cli.validator", () => ({
  CliValidator: mock().mockImplementation(() => ({
    exitHelpfully: mockExitHelpfully,
  })),
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
