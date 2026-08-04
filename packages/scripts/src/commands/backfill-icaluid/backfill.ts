import { type AnyBulkWriteOperation, type Db } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import {
  type ConnectionId,
  type ProviderEventId,
} from "@core/types/sync/identity.contracts";
import { ProviderAuthError } from "@sync/providers/provider-auth.port";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";
import { ProviderConnectionRecordSchema } from "@sync/storage/contracts/provider-connection.contracts";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";

const logger = Logger("scripts.commands.backfill-icaluid");

export type BackfillIcalUidReport = {
  generatedAt: string;
  dryRun: boolean;
  connections: number;
  connectionsSkipped: number;
  calendars: number;
  calendarsFailed: number;
  googleEventsSeen: number;
  reportedByGoogle: number;
  matchedMissingIcalUid: number;
  updated: number;
  samples: Array<{
    connectionId: string;
    calendarId: string;
    providerEventId: string;
    icalUid: string;
  }>;
};

// The only two Google fields the backfill reads per event, plus the id to
// match stored rows by.
export interface GoogleIcalUidItem {
  readonly id?: string | null;
  readonly iCalUID?: string | null;
}

// Injected I/O so tests can script pages and tokens without network access.
export interface BackfillDeps {
  getAccessToken(connectionId: ConnectionId): Promise<string>;
  listIcalUidPage(input: {
    accessToken: string;
    providerCalendarId: string;
    pageToken?: string;
  }): Promise<{
    items: readonly GoogleIcalUidItem[];
    nextPageToken: string | null;
  }>;
}

/**
 * Copy Google's cross-copy correlation key (iCalUID) onto stored sync events
 * that predate MA1 (the normalizer only started mapping it once that slice
 * landed, and the preseed migration never carried it at all). Without this,
 * the same meeting on two connected accounts never merges into one card if
 * either copy predates the ingest change.
 *
 * Walks every readable Google calendar with a fields-limited events.list and
 * sets `providerMetadata.iCalUID` on stored events that lack it, leaving
 * every other providerMetadata fact (e.g. `transparency`) untouched.
 * Idempotent; safe to rerun.
 *
 * `providerMetadata` is a nullable field (null is the common case - the
 * "nothing to record" default), so a dotted-path `$set` on
 * "providerMetadata.iCalUID" would throw for every null row ("cannot create
 * field ... in element {providerMetadata: null}"). Each write instead reads
 * the row's current providerMetadata and replaces the WHOLE field with the
 * merged object, which is safe whether the prior value was null, absent, or
 * an object.
 */
export async function backfillIcalUid(
  db: Db,
  deps: BackfillDeps,
  options: { dryRun: boolean; connectionId?: string },
): Promise<BackfillIcalUidReport> {
  const calendars = new ProviderCalendarRepository(db);
  const events = db.collection<EventRecord>(SYNC_COLLECTIONS.events);

  const report: BackfillIcalUidReport = {
    generatedAt: new Date().toISOString(),
    dryRun: options.dryRun,
    connections: 0,
    connectionsSkipped: 0,
    calendars: 0,
    calendarsFailed: 0,
    googleEventsSeen: 0,
    reportedByGoogle: 0,
    matchedMissingIcalUid: 0,
    updated: 0,
    samples: [],
  };

  const connectionFilter: Record<string, unknown> = {
    provider: "google",
    disconnectedAt: null,
  };
  if (options.connectionId) connectionFilter["_id"] = options.connectionId;

  const cursor = db
    .collection(SYNC_COLLECTIONS.providerConnections)
    .find(connectionFilter);

  for await (const doc of cursor) {
    const connection = ProviderConnectionRecordSchema.parse(doc);
    report.connections += 1;

    let accessToken: string;
    try {
      accessToken = await deps.getAccessToken(connection._id);
    } catch (error) {
      if (error instanceof ProviderAuthError) {
        logger.warn(
          `Skipping connection ${connection._id}: ${error.reason ?? error.message}`,
        );
        report.connectionsSkipped += 1;
        continue;
      }
      throw error;
    }

    const connectionCalendars = await calendars.listByConnection(
      connection.tenantId,
      connection.principalId,
      connection._id,
    );

    for (const calendar of connectionCalendars) {
      if (!calendar.active || !calendar.capabilities.canReadEvents) continue;
      report.calendars += 1;

      try {
        let pageToken: string | undefined;

        do {
          const page = await deps.listIcalUidPage({
            accessToken,
            providerCalendarId: calendar.providerCalendarId,
            pageToken,
          });
          report.googleEventsSeen += page.items.length;

          const icalUidById = new Map<string, string>();
          for (const item of page.items) {
            if (!item.id || !item.iCalUID) continue;
            icalUidById.set(item.id, item.iCalUID);
          }
          report.reportedByGoogle += icalUidById.size;

          if (icalUidById.size > 0) {
            // Scope guard: only rows missing the key, so an already-backfilled
            // or already-synced row is never re-written. This existence check
            // matches whether providerMetadata is absent, null, or an object
            // without the key - all three read as "not set" via a dotted path.
            const missing = await events
              .find(
                {
                  connectionId: connection._id,
                  calendarId: calendar._id,
                  providerEventId: {
                    $in: [...icalUidById.keys()] as ProviderEventId[],
                  },
                  "providerMetadata.iCalUID": { $exists: false },
                },
                {
                  projection: { providerEventId: 1, providerMetadata: 1 },
                },
              )
              .toArray();
            report.matchedMissingIcalUid += missing.length;

            for (const match of missing) {
              if (
                report.samples.length >= 20 ||
                !match.providerEventId ||
                !icalUidById.has(match.providerEventId)
              ) {
                continue;
              }
              report.samples.push({
                connectionId: connection._id,
                calendarId: calendar._id,
                providerEventId: match.providerEventId,
                icalUid: icalUidById.get(match.providerEventId) as string,
              });
            }

            if (!options.dryRun && missing.length > 0) {
              const now = new Date();
              const writes: AnyBulkWriteOperation<EventRecord>[] = missing
                .filter(
                  (
                    match,
                  ): match is typeof match & { providerEventId: string } =>
                    match.providerEventId !== null &&
                    icalUidById.has(match.providerEventId),
                )
                .map((match) => {
                  const icalUid = icalUidById.get(
                    match.providerEventId,
                  ) as string;
                  // Full-field replace, not a dotted $set - see the function
                  // doc comment for why.
                  const mergedProviderMetadata = {
                    ...(match.providerMetadata ?? {}),
                    iCalUID: icalUid,
                  };
                  return {
                    updateOne: {
                      filter: {
                        _id: match._id,
                        "providerMetadata.iCalUID": { $exists: false },
                      },
                      update: {
                        $set: {
                          providerMetadata: mergedProviderMetadata,
                          updatedAt: now,
                        },
                      },
                    },
                  };
                });
              if (writes.length > 0) {
                const result = await events.bulkWrite(writes);
                report.updated += result.modifiedCount;
              }
            }
          }

          pageToken = page.nextPageToken ?? undefined;
        } while (pageToken);
      } catch (error) {
        // Rerunnable by design: log the calendar and keep going rather than
        // failing the fleet pass.
        report.calendarsFailed += 1;
        logger.error(
          `Backfill failed for calendar ${calendar._id} (connection ${connection._id})`,
          error,
        );
      }
    }
  }

  return report;
}
