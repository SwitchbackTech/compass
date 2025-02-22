import { Command } from "commander";
import dotenv from "dotenv";
import path from "path";
import { CliValidator } from "./cli.validator";
import { runBuild } from "./commands/build";
import { startDeleteFlow } from "./commands/delete";
import { ALL_PACKAGES, CATEGORY_VM } from "./common/cli.constants";

dotenv.config({
  path: path.resolve(process.cwd(), "packages/backend/.env"),
});

class CompassCli {
  private program: Command;
  private validator: CliValidator;

  constructor(args: string[]) {
    this.program = this._createProgram();
    this.validator = new CliValidator(this.program);
    this.program.parse(args);
  }

  public async run() {
    const options = this.validator.getCliOptions();
    const { force, user } = options;
    const cmd = this.program.args[0];

    switch (true) {
      case cmd === "build": {
        await this.validator.validateBuild(options);
        await runBuild(options);
        break;
      }
      case cmd === "delete": {
        this.validator.validateDelete(options);
        await startDeleteFlow(user as string, force);
        break;
      }
      default:
        this.validator.exitHelpfully(
          "root",
          `${cmd as string} is not a supported cmd`,
        );
    }
  }

  private _createProgram(): Command {
    const program = new Command();

    program.option("-f, --force", "force operation, no cautionary prompts");

    program
      .command("build")
      .description("build compass package")
      .argument(
        `[${ALL_PACKAGES.join(" | ")}]`,
        "package to build (only provide 1)",
      )
      .option(
        "-c, --clientId <clientId>",
        "google client id to inject into build",
      )
      .option(
        `-e, --environment [${CATEGORY_VM.STAG} | ${CATEGORY_VM.PROD}]`,
        "specify environment",
      );

    program
      .command("delete")
      .description("delete user data from compass database")
      .option(
        "-u, --user [id | email]",
        "specify which user to run script for",
      );
    return program;
  }
}

const cli = new CompassCli(process.argv);
cli.run().catch((err) => {
  console.log(err);
  process.exit(1);
});
