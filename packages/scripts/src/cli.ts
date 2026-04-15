import { CliValidator } from "@scripts/cli.validator";
import { startDeleteFlow } from "@scripts/commands/delete/delete";
import { runMigrator } from "@scripts/commands/migrate";
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
      case cmd === "delete": {
        const { force, user } = options;
        this.validator.validateDelete(options);
        await startDeleteFlow(user as string, force);
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
      .command("delete")
      .description("delete user data from compass database")
      .option("-u, --user [id | email]", "specify which user to run script for")
      .option("-f, --force", "force deletion without confirmation prompts");

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
