import CompassCLI from "@scripts/cli";
import { runBuild } from "@scripts/commands/build";
import { startDeleteFlow } from "@scripts/commands/delete";
import { inviteWaitlist } from "@scripts/commands/invite";
import { NodeEnv } from "../../core/src/constants/core.constants";
import { MigratorType } from "./common/cli.types";

// Mock 'open' module to avoid ESM compatibility issues in Jest
jest.mock("open", () => ({
  __esModule: true,
  default: jest.fn(),
  apps: { chrome: "chrome", firefox: "firefox", brave: "brave", edge: "edge" },
}));

const mockGetCliOptions = jest.fn();
const mockValidateBuild = jest.fn();
const mockValidateDelete = jest.fn();
const mockExitHelpfully = jest.fn();
const mockRunMigrator = jest.fn();

jest.mock("@scripts/cli.validator", () => {
  return {
    CliValidator: jest.fn().mockImplementation(() => ({
      getCliOptions: mockGetCliOptions,
      validateBuild: mockValidateBuild,
      validateDelete: mockValidateDelete,
      exitHelpfully: mockExitHelpfully,
    })),
  };
});

jest.mock("@scripts/commands/build.util");
jest.mock("@scripts/commands/build");
jest.mock("@scripts/commands/delete");
jest.mock("@scripts/commands/invite");

jest.mock("@scripts/commands/migrate", () => ({
  runMigrator: jest
    .fn()
    .mockImplementation((...args) => mockRunMigrator(...args)),
}));

describe("CompassCLI", () => {
  beforeEach(() => jest.clearAllMocks());

  it("runs build command and calls validateBuild and runBuild", async () => {
    mockGetCliOptions.mockReturnValue({ force: false, user: undefined });

    const cli = new CompassCLI([
      "node",
      "cli",
      "build",
      "nodePckgs",
      "-e",
      NodeEnv.Staging,
    ]);

    await cli.run();

    expect(mockValidateBuild).toHaveBeenCalled();
    expect(runBuild).toHaveBeenCalled();
  });

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

  it("runs invite command and calls inviteWaitlist", async () => {
    mockGetCliOptions.mockReturnValue({});

    const cli = new CompassCLI(["node", "cli", "invite"]);

    await cli.run();

    expect(inviteWaitlist).toHaveBeenCalled();
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
