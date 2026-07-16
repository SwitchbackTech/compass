import CompassCLI from "@scripts/cli";
import { MigratorType } from "./common/cli.types";

const mockExitHelpfully = jest.fn();
const mockRunMigrator = jest.fn((): Promise<void> => Promise.resolve());

jest.mock("@scripts/cli.validator", () => {
  return {
    CliValidator: jest.fn().mockImplementation(() => ({
      exitHelpfully: mockExitHelpfully,
    })),
  };
});

jest.mock("@scripts/commands/migrate", () => ({
  __esModule: true,
  runMigrator: jest.fn((type: MigratorType) => mockRunMigrator(type)),
}));

describe("CompassCLI", () => {
  beforeEach(() => jest.clearAllMocks());

  it("runs migrate command and does not throw", async () => {
    const cli = new CompassCLI(["node", "cli", "migrate", "--help"]);

    await cli.run();

    expect(mockRunMigrator).toHaveBeenCalledWith(MigratorType.MIGRATION);
  });

  it("calls exitHelpfully for unsupported command", async () => {
    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation(jest.fn() as never);

    const cli = new CompassCLI(["node", "cli", "unknown"]);

    await cli.run();

    expect(mockExitHelpfully).toHaveBeenCalledWith(
      "unknown is not a supported cmd",
    );

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
