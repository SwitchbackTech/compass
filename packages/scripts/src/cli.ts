import { CliValidator } from "@scripts/cli.validator";
import { runAuditConnectionIdentity } from "@scripts/commands/audit-connection-identity";
import { runBackfillIcalUid } from "@scripts/commands/backfill-icaluid";
import { runManageFailedJobs } from "@scripts/commands/manage-failed-jobs";
import { runPurgeCorruptSyncEvents } from "@scripts/commands/purge-corrupt-sync-events";
import { runPurgeUser } from "@scripts/commands/purge-user";
import { runRefreshConnectionStates } from "@scripts/commands/refresh-connection-states";
import { runRepairRecurringSeries } from "@scripts/commands/repair-recurring-series";
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
      case cmd === "manage-failed-jobs":
        await runManageFailedJobs();
        break;
      case cmd === "purge-user":
        await runPurgeUser();
        break;
      case cmd === "repair-recurring-series":
        await runRepairRecurringSeries();
        break;
      case cmd === "backfill-icaluid":
        await runBackfillIcalUid();
        break;
      case cmd === "audit-connection-identity":
        await runAuditConnectionIdentity();
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
      .command("repair-recurring-series")
      .helpOption(false)
      .allowUnknownOption(true)
      .description(
        "Reproject EXDATE/RDATE series and remove orphaned delete tombstones (--apply to write)",
      );

    program
      .command("refresh-connection-states")
      .helpOption(false)
      .allowUnknownOption(true)
      .description(
        "Re-derive every provider connection's stored state from live evidence (--apply to write)",
      );

    program
      .command("backfill-icaluid")
      .helpOption(false)
      .allowUnknownOption(true)
      .description(
        "Copy Google's cross-copy correlation key onto events that predate it (--apply to write)",
      );

    program
      .command("audit-connection-identity")
      .helpOption(false)
      .allowUnknownOption(true)
      .description(
        "Report connected Google accounts that are another Compass user's login identity (read-only)",
      );

    program
      .command("manage-failed-jobs")
      .helpOption(false)
      .allowUnknownOption(true)
      .description(
        "List/clear/requeue Sync jobs that exhausted the self-heal budget (list | clear | requeue)",
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
