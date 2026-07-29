import { CliValidator } from "@scripts/cli.validator";
import { runInventoryLegacySync } from "@scripts/commands/inventory-legacy-sync";
import { runMigrator } from "@scripts/commands/migrate";
import { runMigrateConnections } from "@scripts/commands/migrate-connections";
import { runMigratePendingIntent } from "@scripts/commands/migrate-pending-intent";
import { runMigrateProviderState } from "@scripts/commands/migrate-provider-state";
import { runPreseedSync } from "@scripts/commands/preseed-sync";
import { runPurgeCorruptSyncEvents } from "@scripts/commands/purge-corrupt-sync-events";
import { runPurgeUser } from "@scripts/commands/purge-user";
import { runRefreshConnectionStates } from "@scripts/commands/refresh-connection-states";
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
    const cmd = this.program.args[0];

    switch (true) {
      case cmd === "migrate":
        await runMigrator(MigratorType.MIGRATION);
        break;
      case cmd === "inventory-legacy-sync":
        await runInventoryLegacySync();
        break;
      case cmd === "migrate-connections":
        await runMigrateConnections();
        break;
      case cmd === "migrate-provider-state":
        await runMigrateProviderState();
        break;
      case cmd === "migrate-pending-intent":
        await runMigratePendingIntent();
        break;
      case cmd === "preseed-sync":
        await runPreseedSync();
        break;
      case cmd === "purge-corrupt-sync-events":
        await runPurgeCorruptSyncEvents();
        break;
      case cmd === "refresh-connection-states":
        await runRefreshConnectionStates();
        break;
      case cmd === "purge-user":
        await runPurgeUser();
        break;
      default:
        this.validator.exitHelpfully(`${cmd as string} is not a supported cmd`);
    }
  }

  private _createProgram(): Command {
    const program = new Command();

    program.enablePositionalOptions(true).passThroughOptions(true);

    // Register longer `migrate-*` / preseed names before `migrate` so Commander
    // does not treat them as unknown args to the Umzug migrate command.
    program
      .command("purge-user")
      .helpOption(false)
      .allowUnknownOption(true)
      .description(
        "delete every Compass row for one email, across the API db, Sync db, and SuperTokens (--apply to write)",
      );

    program
      .command("preseed-sync")
      .helpOption(false)
      .allowUnknownOption(true)
      .description(
        "compose S46–S49 Sync pre-seed with blocking parity (S51; --apply to write)",
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
      .command("migrate-pending-intent")
      .helpOption(false)
      .allowUnknownOption(true)
      .description(
        "preserve unlinked Compass events and submit Sync backfill commands (S49; --apply to write)",
      );

    program
      .command("migrate-provider-state")
      .helpOption(false)
      .allowUnknownOption(true)
      .description(
        "idempotently copy legacy Google calendars/events/cursors into Sync (S48; --apply to write)",
      );

    program
      .command("migrate-connections")
      .helpOption(false)
      .allowUnknownOption(true)
      .description(
        "idempotently copy legacy Google connections into Sync (S47; --apply to write)",
      );

    program
      .command("inventory-legacy-sync")
      .helpOption(false)
      .allowUnknownOption(true)
      .description(
        "read-only inventory of legacy Google sync data (S46; no writes)",
      );

    program
      .command("migrate")
      .helpOption(false)
      .allowUnknownOption(true)
      .description("run database schema migrations");

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
