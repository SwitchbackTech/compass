import { type AnyBulkWriteOperation, type Db } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { type EventColorSlot } from "@core/types/event-color.contracts";
import {
  type ConnectionId,
  type ProviderEventId,
} from "@core/types/sync/identity.contracts";
import { toColorLabelMap } from "@sync/domain/color-label-map";
import { googleColorIdToSlot } from "@sync/providers/google/google-color.map";
import { ProviderAuthError } from "@sync/providers/provider-auth.port";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";
import { ProviderConnectionRecordSchema } from "@sync/storage/contracts/provider-connection.contracts";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";

const logger = Logger("scripts.commands.backfill-event-colors");

export type BackfillEventColorsReport = {
  generatedAt: string;
  dryRun: boolean;
  connections: number;
  connectionsSkipped: number;
  calendars: number;
  calendarsFailed: number;
  googleEventsSeen: number;
  coloredInGoogle: number;
  matchedMissingColor: number;
  updated: number;
  samples: Array<{
    connectionId: string;
    calendarId: string;
    providerEventId: string;
    color?: EventColorSlot;
    colorHex?: string;
  }>;
};

// The only two Google fields the backfill reads per event, plus the id to
// match stored rows by.
export interface GoogleColorItem {
  readonly id?: string | null;
  readonly colorId?: string | null;
  readonly eventLabelId?: string | null;
}

// Injected I/O so tests can script pages and tokens without network access.
export interface BackfillDeps {
  getAccessToken(connectionId: ConnectionId): Promise<string>;
  listColorPage(input: {
    accessToken: string;
    providerCalendarId: string;
    pageToken?: string;
  }): Promise<{
    items: readonly GoogleColorItem[];
    nextPageToken: string | null;
  }>;
}

/**
 * Copy Google event colors onto stored sync events that predate color import.
 *
 * The preseed migration copied event content from the legacy database, which
 * never stored colors, and Google's incremental sync only re-delivers events
 * that change - so an unchanged event keeps its colorless migrated content
 * forever. This walks every readable Google calendar with a fields-limited
 * events.list and sets `content.color` / `content.colorHex` on stored events
 * that lack both, leaving `providerVersion` untouched so incremental sync
 * keeps flowing. Idempotent; safe to rerun.
 */
export async function backfillEventColors(
  db: Db,
  deps: BackfillDeps,
  options: { dryRun: boolean; connectionId?: string },
): Promise<BackfillEventColorsReport> {
  const calendars = new ProviderCalendarRepository(db);
  const events = db.collection<EventRecord>(SYNC_COLLECTIONS.events);

  const report: BackfillEventColorsReport = {
    generatedAt: new Date().toISOString(),
    dryRun: options.dryRun,
    connections: 0,
    connectionsSkipped: 0,
    calendars: 0,
    calendarsFailed: 0,
    googleEventsSeen: 0,
    coloredInGoogle: 0,
    matchedMissingColor: 0,
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
        const labelMap = toColorLabelMap(calendar.eventLabels);
        let pageToken: string | undefined;

        do {
          const page = await deps.listColorPage({
            accessToken,
            providerCalendarId: calendar.providerCalendarId,
            pageToken,
          });
          report.googleEventsSeen += page.items.length;

          // Only events Google actually colors get a write; everything else
          // (the vast majority) is skipped outright.
          const colored = new Map<
            string,
            { color?: EventColorSlot; colorHex?: string }
          >();
          for (const item of page.items) {
            if (!item.id) continue;
            const color = googleColorIdToSlot(item.colorId);
            const colorHex = item.eventLabelId
              ? labelMap.get(item.eventLabelId)
              : undefined;
            if (!color && !colorHex) continue;
            colored.set(item.id, {
              ...(color ? { color } : {}),
              ...(colorHex ? { colorHex } : {}),
            });
          }
          report.coloredInGoogle += colored.size;

          if (colored.size > 0) {
            // Scope guard: only rows missing BOTH fields, so a color set by a
            // user (including an explicit `color: null` clear) or already
            // synced from Google is never clobbered.
            const missingColor = await events
              .find(
                {
                  connectionId: connection._id,
                  calendarId: calendar._id,
                  // Google ids are plain strings; the stored field is branded.
                  providerEventId: {
                    $in: [...colored.keys()] as ProviderEventId[],
                  },
                  "content.color": { $exists: false },
                  "content.colorHex": { $exists: false },
                },
                { projection: { providerEventId: 1 } },
              )
              .toArray();
            const matchedIds = missingColor
              .map((match) => match.providerEventId)
              .filter((id): id is ProviderEventId => id !== null);
            report.matchedMissingColor += matchedIds.length;

            for (const providerEventId of matchedIds) {
              if (report.samples.length >= 20) break;
              report.samples.push({
                connectionId: connection._id,
                calendarId: calendar._id,
                providerEventId,
                ...colored.get(providerEventId),
              });
            }

            if (!options.dryRun && matchedIds.length > 0) {
              const now = new Date();
              const writes: AnyBulkWriteOperation<EventRecord>[] =
                matchedIds.map((providerEventId) => {
                  const resolved = colored.get(providerEventId);
                  return {
                    updateOne: {
                      filter: {
                        connectionId: connection._id,
                        calendarId: calendar._id,
                        providerEventId,
                        "content.color": { $exists: false },
                        "content.colorHex": { $exists: false },
                      },
                      update: {
                        $set: {
                          ...(resolved?.color
                            ? { "content.color": resolved.color }
                            : {}),
                          ...(resolved?.colorHex
                            ? { "content.colorHex": resolved.colorHex }
                            : {}),
                          updatedAt: now,
                        },
                      },
                    },
                  };
                });
              const result = await events.bulkWrite(writes);
              report.updated += result.modifiedCount;
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
