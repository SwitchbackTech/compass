import path from "path";
import dotenv from "dotenv";
dotenv.config({
  path: path.resolve(process.cwd(), "packages/backend/.env"),
});
import { Command } from "commander";

import { runBuild } from "./commands/build";
import { ALL_PACKAGES, CATEGORY_VM } from "./common/cli.constants";
import { startDeleteFlow } from "./commands/delete";
import { Options_Cli } from "./common/cli.types";
import {
  log,
  mergeOptions,
  validateOptions,
  validatePackages,
} from "./common/cli.utils";

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
    const validOptions = validateOptions(options);

    return validOptions;
  }

  public async run() {
    const { user, force, packages } = this.options;
    const cmd = this.program.args[0];

    switch (true) {
      case cmd === "build": {
        validatePackages(packages);
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
