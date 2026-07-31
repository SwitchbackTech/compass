import { CliValidator } from "@scripts/cli.validator";
import { runBackfillEventColors } from "@scripts/commands/backfill-event-colors";
import { runPurgeCorruptSyncEvents } from "@scripts/commands/purge-corrupt-sync-events";
import { runPurgeUser } from "@scripts/commands/purge-user";
import { runRefreshConnectionStates } from "@scripts/commands/refresh-connection-states";
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
    const cmd = this.program.args[0];

    switch (true) {
      case cmd === "purge-corrupt-sync-events":
        await runPurgeCorruptSyncEvents();
        break;
      case cmd === "refresh-connection-states":
        await runRefreshConnectionStates();
        break;
      case cmd === "purge-user":
        await runPurgeUser();
        break;
      case cmd === "backfill-event-colors":
        await runBackfillEventColors();
        break;
      default:
        this.validator.exitHelpfully(`${cmd as string} is not a supported cmd`);
    }
  }

  private _createProgram(): Command {
    const program = new Command();

    program.enablePositionalOptions(true).passThroughOptions(true);

    program
      .command("purge-user")
      .helpOption(false)
      .allowUnknownOption(true)
      .description(
        "delete every Compass row for one email, across the API db, Sync db, and SuperTokens (--apply to write)",
      );

    program
      .command("purge-corrupt-sync-events")
      .helpOption(false)
      .allowUnknownOption(true)
      .description(
        "Delete Sync events that fail EventRecordSchema (poison from aborted migrate)",
      );

    program
      .command("refresh-connection-states")
      .helpOption(false)
      .allowUnknownOption(true)
      .description(
        "Re-derive every provider connection's stored state from live evidence (--apply to write)",
      );

    program
      .command("backfill-event-colors")
      .helpOption(false)
      .allowUnknownOption(true)
      .description(
        "Copy Google event colors onto stored events that predate color sync (--apply to write)",
      );

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
