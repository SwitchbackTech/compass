import { describe, expect, it } from "bun:test";
import CompassCLI, {
  type CompassCliDeps,
  type CompassCliValidator,
} from "@scripts/cli";
import { type Options_Cli } from "@scripts/common/cli.types";
import { NodeEnv } from "../../core/src/constants/core.constants";
import { MigratorType } from "./common/cli.types";

type CliTestCalls = {
  exitHelpfully: Array<[cmd: string, msg?: string]>;
  runBuild: Options_Cli[];
  runMigrator: MigratorType[];
  startDeleteFlow: Array<[user: string, force?: boolean]>;
  validateBuild: number;
  validateDelete: number;
};

function createCalls(): CliTestCalls {
  return {
    exitHelpfully: [],
    runBuild: [],
    runMigrator: [],
    startDeleteFlow: [],
    validateBuild: 0,
    validateDelete: 0,
  };
}

function createDeps(options: Options_Cli = {}): {
  calls: CliTestCalls;
  deps: CompassCliDeps;
  validator: CompassCliValidator;
} {
  const calls = createCalls();

  const validator: CompassCliValidator = {
    exitHelpfully(cmd, msg) {
      calls.exitHelpfully.push([cmd, msg]);
    },
    getCliOptions() {
      return options;
    },
    validateBuild() {
      calls.validateBuild += 1;
      return Promise.resolve();
    },
    validateDelete() {
      calls.validateDelete += 1;
    },
  };

  return {
    calls,
    deps: {
      createValidator: () => validator,
      parseArgs(program, args) {
        program.parse(args);
      },
      runBuild(input) {
        calls.runBuild.push(input);
        return Promise.resolve();
      },
      runMigrator(input) {
        calls.runMigrator.push(input);
        return Promise.resolve();
      },
      startDeleteFlow(user, force) {
        calls.startDeleteFlow.push([user, force]);
        return Promise.resolve();
      },
    },
    validator,
  };
}

describe("CompassCLI", () => {
  it("runs build command and calls validateBuild and runBuild", async () => {
    const { calls, deps } = createDeps({
      force: false,
      user: undefined,
    });

    const cli = new CompassCLI(
      ["bun", "cli", "build", "nodePckgs", "-e", NodeEnv.Staging],
      deps,
    );

    await cli.run();

    expect(calls.validateBuild).toBe(1);
    expect(calls.runBuild).toHaveLength(1);
  });

  it("runs delete command and calls validateDelete and startDeleteFlow", async () => {
    const { calls, deps } = createDeps({
      force: true,
      user: "user@example.com",
    });

    const cli = new CompassCLI(["bun", "cli", "delete"], deps);

    await cli.run();

    expect(calls.validateDelete).toBe(1);
    expect(calls.startDeleteFlow).toEqual([["user@example.com", true]]);
  });

  it("runs migrate command and does not throw", async () => {
    const { calls, deps } = createDeps({});

    const cli = new CompassCLI(["bun", "cli", "migrate", "--help"], deps);

    await cli.run();

    expect(calls.runMigrator).toEqual([MigratorType.MIGRATION]);
  });

  it("runs seed command and does not throw", async () => {
    const { calls, deps } = createDeps({});

    const cli = new CompassCLI(["bun", "cli", "seed"], deps);

    await cli.run();

    expect(calls.runMigrator).toEqual([MigratorType.SEEDER]);
  });

  it("calls exitHelpfully for unsupported command", async () => {
    const { calls, deps } = createDeps({});

    const cli = new CompassCLI(["bun", "cli"], {
      ...deps,
      parseArgs(program) {
        program.args = ["unknown"];
      },
    });

    await cli.run();

    expect(calls.exitHelpfully).toEqual([
      ["root", "unknown is not a supported cmd"],
    ]);
  });
});
