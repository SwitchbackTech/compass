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
import { getPckgsTo, log, mergeOptions } from "./common/cli.utils";

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
      "--user [id | email]",
      "specify which user to run script for"
    );

    program
      .command("build")
      .description("build compass package")
      .argument(
        `[${ALL_PACKAGES.join(" | ")}]`,
        "package to build (only provde 1 at a time)"
      )
      .option(
        "-c, --clientId <clientId>",
        "google client id to inject into build"
      );

    program
      .command("delete")
      .description("delete user data from compass database");
    return program;
  }

  private getCliOptions(): Options_Cli {
    const options = mergeOptions(this.program);
    const validOptions = this._validateOptions(options);

    return validOptions;
  }

  public async run() {
    const { user, force } = this.options;
    const cmd = this.program.args[0];

    switch (true) {
      case cmd === "build": {
        await this._validateBuild();
        await runBuild(this.options);
        break;
      }
      case cmd === "delete": {
        if (!user || typeof user !== "string") {
          this._exitHelpfully("You must supply a user");
        }
        await startDeleteFlow(user as string, force);
        break;
      }
      default:
        this._exitHelpfully("Unsupported cmd");
    }
  }

  private _exitHelpfully(msg?: string) {
    msg && log.error(msg);
    console.log(this.program.helpInformation());
    process.exit(1);
  }

  private async _validateBuild() {
    const packages = this.options.packages
      ? this.options.packages
      : await getPckgsTo("build");

    if (!packages) {
      this._exitHelpfully("Package must be defined");
    }

    const unsupportedPackages = packages.filter(
      (pkg) => !ALL_PACKAGES.includes(pkg)
    );
    if (unsupportedPackages.length > 0) {
      this._exitHelpfully(
        `One or more of these packages isn't supported: ${unsupportedPackages.toString()}`
      );
    }
  }

  private _validateOptions(options: Options_Cli) {
    const { data, error } = Schema_Options_Cli.safeParse(options);
    if (error) {
      this._exitHelpfully(
        `Invalid CLI options: ${JSON.stringify(error.format())}`
      );
    }

    return data as Options_Cli;
  }
}

const cli = new CompassCli(process.argv);
cli.run().catch((err) => {
  console.log(err);
  process.exit(1);
});

export const validatePackages = (packages: string[] | undefined) => {
  if (!packages) {
    log.error("Package must be defined");
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
};
