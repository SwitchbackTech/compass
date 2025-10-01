// sort-imports-ignore
import "@scripts/init";

import { CliValidator } from "@scripts/cli.validator";
import { runBuild } from "@scripts/commands/build";
import { startDeleteFlow } from "@scripts/commands/delete";
import { inviteWaitlist } from "@scripts/commands/invite";
import { runMigrator } from "@scripts/commands/migrate";
import { ALL_PACKAGES, CATEGORY_VM } from "@scripts/common/cli.constants";
import { MigratorType } from "@scripts/common/cli.types";
import { Command } from "commander";

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
      case cmd === "invite": {
        await inviteWaitlist();
        break;
      }
      case cmd === "migrate":
      case cmd === "seed": {
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

    program.command("invite").description("invite users from the waitlist");

    program
      .enablePositionalOptions(true)
      .passThroughOptions(true)
      .command("migrate")
      .helpOption(false)
      .allowUnknownOption(true)
      .description("run database schema migrations")
      .action(() => runMigrator(MigratorType.MIGRATION));

    program
      .enablePositionalOptions(true)
      .passThroughOptions(true)
      .command("seed")
      .helpOption(false)
      .allowUnknownOption(true)
      .description("run seed migrations to populate the database with data")
      .action(() => runMigrator(MigratorType.SEEDER));

    return program;
  }
}

const cli = new CompassCli(process.argv);
cli.run().catch((err) => {
  console.log(err);
  process.exit(1);
});
