// sort-imports-ignore
import "@scripts/init";

import { CliValidator } from "@scripts/cli.validator";
import { runBuild } from "@scripts/commands/build";
import { startDeleteFlow } from "@scripts/commands/delete";
import { inviteWaitlist } from "@scripts/commands/invite";
import { runMigrator } from "@scripts/commands/migrate";
import { ALL_PACKAGES, ENVIRONMENT } from "@scripts/common/cli.constants";
import { MigratorType } from "@scripts/common/cli.types";
import { Command } from "commander";

export default class CompassCLI {
  private program: Command;
  private validator: CliValidator;

  constructor(args: string[]) {
    this.program = this._createProgram();
    this.validator = new CliValidator(this.program);
    this.program.parse(args);
  }

  public async run() {
    const options = this.validator.getCliOptions();
    const cmd = this.program.args[0];

    switch (true) {
      case cmd === "build": {
        await this.validator.validateBuild(options);
        await runBuild(options);
        break;
      }
      case cmd === "delete": {
        const { force, user } = options;
        this.validator.validateDelete(options);
        await startDeleteFlow(user as string, force);
        break;
      }
      case cmd === "invite": {
        await inviteWaitlist();
        break;
      }
      case cmd === "migrate":
        await runMigrator(MigratorType.MIGRATION);
        break;
      case cmd === "seed": {
        await runMigrator(MigratorType.SEEDER);
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
        `-e, --environment [local | ${ENVIRONMENT.STAG} | ${ENVIRONMENT.PROD}]`,
        "specify environment",
      );

    program
      .command("delete")
      .description("delete user data from compass database")
      .option("-u, --user [id | email]", "specify which user to run script for")
      .option("-f, --force", "force deletion without confirmation prompts");

    program.command("invite").description("invite users from the waitlist");

    program
      .enablePositionalOptions(true)
      .passThroughOptions(true)
      .command("migrate")
      .helpOption(false)
      .allowUnknownOption(true)
      .description("run database schema migrations");

    program
      .enablePositionalOptions(true)
      .passThroughOptions(true)
      .command("seed")
      .helpOption(false)
      .allowUnknownOption(true)
      .description("run seed migrations to populate the database with data");

    return program;
  }
}

if (require.main === module) {
  const cli = new CompassCLI(process.argv);

  cli.run().catch((err) => {
    console.log(err);
    process.exit(1);
  });
}
