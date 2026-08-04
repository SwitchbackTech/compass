import { calendar } from "@googleapis/calendar";
import {
  type BackfillDeps,
  backfillIcalUid,
} from "@scripts/commands/backfill-icaluid/backfill";
import { OAuth2Client } from "google-auth-library";
import { loadCompassConfig } from "@core/config/compass.config";
import { Logger } from "@core/logger/winston.logger";
import { CredentialCustody } from "@sync/credentials/credential-custody.service";
import { GoogleAuthAdapter } from "@sync/providers/google/google-auth.adapter";
import { GOOGLE_REQUEST_TIMEOUT_MS } from "@sync/providers/google/google-http.constants";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { SyncMongoService } from "@sync/storage/sync-mongo.service";

const logger = Logger("scripts.commands.backfill-icaluid");

function syncMongoUri(): string {
  const fromEnv = process.env["SYNC_MONGO_URI"]?.trim();
  if (fromEnv) return fromEnv;
  const uri = loadCompassConfig().sync?.mongoUri?.trim();
  if (!uri) {
    throw new Error(
      "Set SYNC_MONGO_URI or add sync.mongoUri to compass.yaml before backfill-icaluid",
    );
  }
  return uri;
}

function googleClientCredentials(): { clientId: string; clientSecret: string } {
  let clientId = process.env["GOOGLE_CLIENT_ID"]?.trim();
  let clientSecret = process.env["GOOGLE_CLIENT_SECRET"]?.trim();
  if (!clientId || !clientSecret) {
    const google = loadCompassConfig().google;
    clientId ||= google?.clientId?.trim();
    clientSecret ||= google?.clientSecret?.trim();
  }
  if (!clientId || !clientSecret) {
    throw new Error(
      "Set GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET or add google.clientId/clientSecret to compass.yaml before backfill-icaluid",
    );
  }
  return { clientId, clientSecret };
}

function parseArgs(argv: string[]): {
  dryRun: boolean;
  connectionId?: string;
} {
  const connectionFlag = argv.indexOf("--connection");
  const connectionId =
    connectionFlag >= 0 ? argv[connectionFlag + 1]?.trim() : undefined;
  if (connectionFlag >= 0 && !connectionId) {
    throw new Error("--connection requires a connection id");
  }
  return {
    dryRun: !argv.includes("--apply"),
    ...(connectionId ? { connectionId } : {}),
  };
}

// A fields-limited events.list: id + iCalUID only, not full payloads - two
// orders of magnitude less bandwidth than the sync reader, and no strict
// normalization that would drop rows this pass doesn't care about.
const listIcalUidPage: BackfillDeps["listIcalUidPage"] = async ({
  accessToken,
  providerCalendarId,
  pageToken,
}) => {
  const auth = new OAuth2Client();
  auth.setCredentials({ access_token: accessToken });
  const gcal = calendar({
    version: "v3",
    auth,
    timeout: GOOGLE_REQUEST_TIMEOUT_MS,
  });
  const { data } = await gcal.events.list({
    calendarId: providerCalendarId,
    pageToken,
    // Masters and exceptions as distinct items, matching how sync stores
    // providerEventIds.
    singleEvents: false,
    showDeleted: false,
    maxResults: 2500,
    fields: "items(id,iCalUID),nextPageToken",
  });
  return {
    items: data.items ?? [],
    nextPageToken: data.nextPageToken ?? null,
  };
};

/**
 * Copy Google's cross-copy correlation key (iCalUID) onto stored sync events
 * that predate MA1's ingest change. Default dry-run; `--apply` persists;
 * `--connection <id>` scopes to one connection. Safe to rerun.
 *
 *   bun run cli backfill-icaluid [--apply] [--connection <id>]
 */
export async function runBackfillIcalUid(): Promise<void> {
  const syncMongo = new SyncMongoService();
  try {
    const { dryRun, connectionId } = parseArgs(process.argv.slice(3));
    const { clientId, clientSecret } = googleClientCredentials();

    await syncMongo.connect({
      uri: syncMongoUri(),
      enforceLeastPrivilege: false,
      forbiddenDatabaseName: "prod_calendar",
    });

    const custody = new CredentialCustody(
      new CredentialRepository(syncMongo.db),
      new GoogleAuthAdapter(clientId, clientSecret),
    );

    const report = await backfillIcalUid(
      syncMongo.db,
      {
        getAccessToken: (id) => custody.getValidAccessToken(id),
        listIcalUidPage,
      },
      { dryRun, ...(connectionId ? { connectionId } : {}) },
    );

    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    logger.info(
      `backfill-icaluid dryRun=${report.dryRun} reportedByGoogle=${report.reportedByGoogle} matchedMissingIcalUid=${report.matchedMissingIcalUid} updated=${report.updated}`,
    );
    await syncMongo.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error(error);
    try {
      await syncMongo.disconnect();
    } catch {
      // ignore
    }
    process.exit(1);
  }
}
