import path from "path";
import dotenv from "dotenv";
dotenv.config({
  path: path.resolve(process.cwd(), "packages/backend/.env"),
});
import { Command } from "commander";

import { runBuild } from "./commands/build";
import { ALL_PACKAGES, CATEGORY_VM } from "./common/cli.constants";
import { startDeleteFlow } from "./commands/delete";
import { Options_Cli, Schema_Options_Cli } from "./common/cli.types";
import { log } from "./common/cli.utils";

class CompassCli {
  private program: Command;
  private options: Options_Cli;

  constructor(args: string[]) {
    this.program = this.createProgram();
    this.program.parse(args);
    this.options = this.getCliOptions();
  }

  private createProgram(): Command {
    const program = new Command();
    program.option(
      `-e, --environment [${CATEGORY_VM.STAG} | ${CATEGORY_VM.PROD}]`,
      "specify environment"
    );
    program.option("-f, --force", "force operation, no cautionary prompts");
    program.option(
      "-u, --user [id | email]",
      "specify which user to run script for"
    );

    program
      .command("build")
      .description("build compass package(s)")
      .argument(
        `[${ALL_PACKAGES.join(" | ")}]`,
        "package(s) to build, separated by comma"
      )
      .option("--skip-env", "skip copying env files to build");

    program
      .command("delete")
      .description("delete user data from compass database");
    return program;
  }

  private getCliOptions(): Options_Cli {
    const _options = this.program.opts();
    const packages = this.program.args[1]?.split(",");
    const options: Options_Cli = {
      ..._options,
      force: _options["force"] === true,
      packages,
    };

    const { data, error } = Schema_Options_Cli.safeParse(options);
    if (error) {
      log.error(`Invalid CLI options: ${JSON.stringify(error.format())}`);
      process.exit(1);
    }

    return data;
  }

  private validatePackages(packages: string[] | undefined) {
    if (!packages) {
      log.error("Packages must be defined");
      process.exit(1);
    }
    const unsupportedPackages = packages.filter(
      (pkg) => !ALL_PACKAGES.includes(pkg)
    );
    if (unsupportedPackages.length > 0) {
      log.error(
        `One or more of these packages isn't supported: ${unsupportedPackages.toString()}`
      );
      process.exit(1);
    }
  }

  public async run() {
    const { user, force, packages } = this.options;
    const cmd = this.program.args[0];

    switch (true) {
      case cmd === "build": {
        this.validatePackages(packages);
        await runBuild(this.options);
        break;
      }
      case cmd === "delete": {
        if (!user || typeof user !== "string") {
          this.exitHelpfully("You must supply a user");
        }
        await startDeleteFlow(user as string, force);
        break;
      }
      default:
        this.exitHelpfully("Unsupported cmd");
    }
  }

  private exitHelpfully(msg?: string) {
    msg && log.error(msg);
    console.log(this.program.helpInformation());
    process.exit(1);
  }
}

const cli = new CompassCli(process.argv);
cli.run().catch((err) => {
  console.log(err);
  process.exit(1);
});
