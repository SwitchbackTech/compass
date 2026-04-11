import CompassCLI from "@scripts/cli";
import { startDeleteFlow } from "@scripts/commands/delete/delete";
import { MigratorType } from "./common/cli.types";

// Mock 'open' module to avoid ESM compatibility issues in Jest
jest.mock("open", () => ({
  __esModule: true,
  default: jest.fn(),
  apps: { chrome: "chrome", firefox: "firefox", brave: "brave", edge: "edge" },
}));

const mockGetCliOptions = jest.fn();
const mockValidateDelete = jest.fn();
const mockExitHelpfully = jest.fn();
const mockRunMigrator = jest.fn((type: MigratorType): Promise<void> => {
  void type;
  return Promise.resolve();
});

jest.mock("@scripts/cli.validator", () => {
  return {
    CliValidator: jest.fn().mockImplementation(() => ({
      getCliOptions: mockGetCliOptions,
      validateDelete: mockValidateDelete,
      exitHelpfully: mockExitHelpfully,
    })),
  };
});

jest.mock("@scripts/commands/delete/delete", () => ({
  __esModule: true,
  startDeleteFlow: jest.fn(),
}));

jest.mock("@scripts/commands/migrate", () => ({
  __esModule: true,
  runMigrator: jest.fn((type: MigratorType) => mockRunMigrator(type)),
}));

describe("CompassCLI", () => {
  beforeEach(() => jest.clearAllMocks());

  it("runs delete command and calls validateDelete and startDeleteFlow", async () => {
    mockGetCliOptions.mockReturnValue({
      force: true,
      user: "user@example.com",
    });

    const cli = new CompassCLI(["node", "cli", "delete"]);

    await cli.run();

    expect(mockValidateDelete).toHaveBeenCalled();
    expect(startDeleteFlow).toHaveBeenCalledWith("user@example.com", true);
  });

  it("runs migrate command and does not throw", async () => {
    mockGetCliOptions.mockReturnValue({});

    const cli = new CompassCLI(["node", "cli", "migrate", "--help"]);

    await cli.run();

    expect(mockRunMigrator).toHaveBeenCalledWith(MigratorType.MIGRATION);
  });

  it("runs seed command and does not throw", async () => {
    mockGetCliOptions.mockReturnValue({});

    const cli = new CompassCLI(["node", "cli", "seed"]);

    await cli.run();

    expect(mockRunMigrator).toHaveBeenCalledWith(MigratorType.SEEDER);
  });

  it("calls exitHelpfully for unsupported command", async () => {
    mockGetCliOptions.mockReturnValue({});

    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation(jest.fn() as never);

    const cli = new CompassCLI(["node", "cli", "unknown"]);

    await cli.run();

    expect(mockExitHelpfully).toHaveBeenCalledWith(
      "root",
      "unknown is not a supported cmd",
    );

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
