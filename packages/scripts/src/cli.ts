import { CliValidator } from "@scripts/cli.validator";
import { runAuditConnectionIdentity } from "@scripts/commands/audit-connection-identity";
import { runAuditStripeConfig } from "@scripts/commands/audit-stripe-config";
import { runBackfillBilling } from "@scripts/commands/backfill-billing";
import { runManageFailedJobs } from "@scripts/commands/manage-failed-jobs";
import { runPurgeUser } from "@scripts/commands/purge-user";
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
      case cmd === "manage-failed-jobs":
        await runManageFailedJobs();
        break;
      case cmd === "purge-user":
        await runPurgeUser();
        break;
      case cmd === "backfill-billing":
        await runBackfillBilling();
        break;
      case cmd === "audit-connection-identity":
        await runAuditConnectionIdentity();
        break;
      case cmd === "audit-stripe-config":
        await runAuditStripeConfig();
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
      .command("backfill-billing")
      .helpOption(false)
      .allowUnknownOption(true)
      .description(
        "stamp awaiting_checkout on accounts with no billing status (--apply to write)",
      );

    program
      .command("audit-connection-identity")
      .helpOption(false)
      .allowUnknownOption(true)
      .description(
        "Report connected Google accounts that are another Compass user's login identity (read-only)",
      );

    program
      .command("audit-stripe-config")
      .helpOption(false)
      .allowUnknownOption(true)
      .description(
        "Check the live Stripe account against this build: webhook url/events/api_version, price, and Tax status (read-only, exits 1 on drift)",
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
