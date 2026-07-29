import {
  type InventoryDuplicate,
  type InventoryMissingAuthority,
  type InventoryOrphan,
  type InventorySkip,
  type InventoryUserTarget,
  type LegacySyncInventoryReport,
  LegacySyncInventoryReportSchema,
} from "@scripts/commands/inventory-legacy-sync/report.types";
import { type ObjectId } from "mongodb";
import { Resource_Sync, type Schema_Sync } from "@core/types/sync.types";
import { type Schema_User } from "@core/types/user.types";
import { type Schema_Watch } from "@core/types/watch.types";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import { toSyncPrincipal } from "@backend/common/services/sync-service/sync-principal";
import { type EventRecord } from "@backend/event/event.record";

export interface InventoryCollections {
  users: Array<{ _id: ObjectId } & Schema_User>;
  calendars: CalendarRecord[];
  events: EventRecord[];
  syncDocs: Array<Partial<Schema_Sync> & { _id?: ObjectId; user: string }>;
  watches: Schema_Watch[];
}

export interface InventoryOptions {
  /** Injected for stable repeated reports in tests. */
  now?: Date;
}

const byId = (a: string, b: string) => a.localeCompare(b);

function hasRefreshToken(user: Schema_User): boolean {
  const token = user.google?.gRefreshToken?.trim();
  return typeof token === "string" && token.length > 0;
}

function hasGoogleIdentity(user: Schema_User): boolean {
  return typeof user.google?.googleId?.trim() === "string"
    ? user.google.googleId.trim().length > 0
    : false;
}

function isExpiredWatch(watch: Schema_Watch, now: Date): boolean {
  const expiration = Number(watch.expiration);
  if (!Number.isFinite(expiration)) return false;
  return expiration <= now.getTime();
}

function nestedHasLegacyChannel(details: unknown): boolean {
  if (!details || typeof details !== "object") return false;
  const row = details as Record<string, unknown>;
  return (
    typeof row["channelId"] === "string" ||
    typeof row["resourceId"] === "string" ||
    typeof row["expiration"] === "string"
  );
}

// Production has a few sync docs where nested google.events / calendarlist
// were stored as array-like objects ({"0": row}) instead of arrays. Treat both
// as row lists so inventory/preseed can run.
export function legacyCursorRows<T>(value: unknown): T[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "object")
    return Object.values(value as Record<string, T>);
  return [];
}

/**
 * Read-only inventory of legacy Compass Google sync data (S46).
 * Never writes, deletes, refreshes tokens, or calls providers.
 */
export function inventoryLegacySyncData(
  input: InventoryCollections,
  options: InventoryOptions = {},
): LegacySyncInventoryReport {
  const now = options.now ?? new Date();
  const skips: InventorySkip[] = [];
  const duplicates: InventoryDuplicate[] = [];
  const orphans: InventoryOrphan[] = [];
  const missingAuthority: InventoryMissingAuthority[] = [];

  const users = [...input.users].sort((a, b) =>
    a._id.toHexString().localeCompare(b._id.toHexString()),
  );
  const userIds = new Set(users.map((u) => u._id.toHexString()));

  const calendars = [...input.calendars];
  const events = [...input.events];
  const syncDocs = [...input.syncDocs];
  const watches = [...input.watches];

  // --- duplicates: google calendars ---
  const googleCalKeyCounts = new Map<string, string[]>();
  for (const calendar of calendars) {
    if (calendar.source.provider !== "google") continue;
    const key = `${calendar.userId.toHexString()}:${calendar.source.calendarId}`;
    const ids = googleCalKeyCounts.get(key) ?? [];
    ids.push(calendar._id.toHexString());
    googleCalKeyCounts.set(key, ids);
  }
  for (const [key, ids] of [...googleCalKeyCounts.entries()].sort(([a], [b]) =>
    byId(a, b),
  )) {
    if (ids.length < 2) continue;
    duplicates.push({
      kind: "google_calendar_identity",
      key,
      count: ids.length,
      ids: [...ids].sort(byId),
    });
    for (const id of ids) {
      skips.push({
        category: "duplicate_google_calendar",
        id,
        detail: `duplicate (userId, source.calendarId)=${key}`,
      });
    }
  }

  // --- duplicates: sync docs per user ---
  const syncByUser = new Map<string, string[]>();
  for (const doc of syncDocs) {
    const id = doc._id?.toHexString() ?? `user:${doc.user}`;
    const ids = syncByUser.get(doc.user) ?? [];
    ids.push(id);
    syncByUser.set(doc.user, ids);
  }
  for (const [userId, ids] of [...syncByUser.entries()].sort(([a], [b]) =>
    byId(a, b),
  )) {
    if (ids.length < 2) continue;
    duplicates.push({
      kind: "sync_user",
      key: userId,
      count: ids.length,
      ids: [...ids].sort(byId),
    });
    for (const id of ids) {
      skips.push({
        category: "duplicate_sync_user",
        id,
        detail: `multiple sync documents for user=${userId}`,
      });
    }
  }

  // --- duplicates: watches ---
  const watchKeyCounts = new Map<string, string[]>();
  for (const watch of watches) {
    const key = `${watch.user}:${watch.gCalendarId}`;
    const id = String(watch._id);
    const ids = watchKeyCounts.get(key) ?? [];
    ids.push(id);
    watchKeyCounts.set(key, ids);
  }
  for (const [key, ids] of [...watchKeyCounts.entries()].sort(([a], [b]) =>
    byId(a, b),
  )) {
    if (ids.length < 2) continue;
    duplicates.push({
      kind: "watch_identity",
      key,
      count: ids.length,
      ids: [...ids].sort(byId),
    });
    for (const id of ids) {
      skips.push({
        category: "duplicate_watch",
        id,
        detail: `duplicate (user, gCalendarId)=${key}`,
      });
    }
  }

  // --- orphans ---
  const calendarById = new Map(
    calendars.map((calendar) => [calendar._id.toHexString(), calendar]),
  );
  const googleCalByUser = new Map<string, Set<string>>();
  for (const calendar of calendars) {
    if (calendar.source.provider !== "google") continue;
    const userId = calendar.userId.toHexString();
    const set = googleCalByUser.get(userId) ?? new Set();
    set.add(calendar.source.calendarId);
    googleCalByUser.set(userId, set);
  }

  for (const calendar of calendars) {
    const userId = calendar.userId.toHexString();
    if (userIds.has(userId)) continue;
    orphans.push({
      kind: "calendar",
      id: calendar._id.toHexString(),
      reason: `calendar.userId=${userId} has no user`,
    });
    skips.push({
      category: "orphan_calendar",
      id: calendar._id.toHexString(),
      detail: `calendar.userId=${userId} has no user`,
    });
  }

  for (const event of events) {
    const calendarId = event.calendarId.toHexString();
    const calendar = calendarById.get(calendarId);
    if (calendar && userIds.has(calendar.userId.toHexString())) continue;
    const reason = calendar
      ? `event.calendarId=${calendarId} calendar.userId=${calendar.userId.toHexString()} has no user`
      : `event.calendarId=${calendarId} has no calendar`;
    orphans.push({
      kind: "event",
      id: event._id.toHexString(),
      reason,
    });
    skips.push({
      category: "orphan_event",
      id: event._id.toHexString(),
      detail: reason,
    });
  }

  for (const doc of syncDocs) {
    if (userIds.has(doc.user)) continue;
    const id = doc._id?.toHexString() ?? `user:${doc.user}`;
    orphans.push({
      kind: "sync",
      id,
      reason: `sync.user=${doc.user} has no user`,
    });
    skips.push({
      category: "orphan_sync",
      id,
      detail: `sync.user=${doc.user} has no user`,
    });
  }

  for (const watch of watches) {
    if (!userIds.has(watch.user)) {
      const id = String(watch._id);
      orphans.push({
        kind: "watch",
        id,
        reason: `watch.user=${watch.user} has no user`,
      });
      skips.push({
        category: "orphan_watch",
        id,
        detail: `watch.user=${watch.user} has no user`,
      });
      continue;
    }
    if (watch.gCalendarId === Resource_Sync.CALENDAR) continue;
    const known = googleCalByUser.get(watch.user);
    if (known?.has(watch.gCalendarId)) continue;
    const id = String(watch._id);
    orphans.push({
      kind: "watch_calendar",
      id,
      reason: `watch gCalendarId=${watch.gCalendarId} has no google calendar for user`,
    });
    skips.push({
      category: "orphan_watch_calendar",
      id,
      detail: `watch gCalendarId=${watch.gCalendarId} has no google calendar for user=${watch.user}`,
    });
  }

  const seenOrphanCursorIds = new Set<string>();
  for (const doc of syncDocs) {
    const eventRows = legacyCursorRows<{ gCalendarId: string }>(
      doc.google?.events,
    );
    for (const row of eventRows) {
      const known = googleCalByUser.get(doc.user);
      if (known?.has(row.gCalendarId)) continue;
      const id = `${doc.user}:${row.gCalendarId}`;
      if (seenOrphanCursorIds.has(id)) continue;
      seenOrphanCursorIds.add(id);
      orphans.push({
        kind: "cursor_calendar",
        id,
        reason: `events cursor gCalendarId=${row.gCalendarId} has no google calendar`,
      });
      skips.push({
        category: "orphan_cursor_calendar",
        id,
        detail: `events cursor gCalendarId=${row.gCalendarId} has no google calendar for user=${doc.user}`,
      });
    }
  }

  // --- legacy nested watch fields on sync docs ---
  for (const doc of syncDocs) {
    const id = doc._id?.toHexString() ?? `user:${doc.user}`;
    const rows = [
      ...legacyCursorRows(doc.google?.events),
      ...legacyCursorRows(doc.google?.calendarlist),
    ];
    if (!rows.some(nestedHasLegacyChannel)) continue;
    skips.push({
      category: "legacy_nested_watch",
      id,
      detail:
        "sync.google.* still carries channelId/resourceId/expiration (pre-watch-collection)",
    });
  }

  // --- per-user authority + targets ---
  const calendarsByUser = new Map<string, CalendarRecord[]>();
  for (const calendar of calendars) {
    const userId = calendar.userId.toHexString();
    const list = calendarsByUser.get(userId) ?? [];
    list.push(calendar);
    calendarsByUser.set(userId, list);
  }

  const calendarOwner = new Map<string, string>();
  for (const calendar of calendars) {
    calendarOwner.set(
      calendar._id.toHexString(),
      calendar.userId.toHexString(),
    );
  }

  const eventsByUser = new Map<
    string,
    { linkedGoogle: number; unlinked: number }
  >();
  for (const event of events) {
    const owner = calendarOwner.get(event.calendarId.toHexString());
    if (!owner) continue;
    const bucket = eventsByUser.get(owner) ?? {
      linkedGoogle: 0,
      unlinked: 0,
    };
    if (event.externalReference?.provider === "google") {
      bucket.linkedGoogle += 1;
    } else {
      bucket.unlinked += 1;
    }
    eventsByUser.set(owner, bucket);
  }

  const syncDocByUser = new Map<string, (typeof syncDocs)[number]>();
  for (const doc of syncDocs) {
    const existing = syncDocByUser.get(doc.user);
    const docId = doc._id?.toHexString() ?? `user:${doc.user}`;
    if (
      !existing ||
      byId(docId, existing._id?.toHexString() ?? `user:${existing.user}`) < 0
    ) {
      syncDocByUser.set(doc.user, doc);
    }
  }

  const watchesByUser = new Map<string, Schema_Watch[]>();
  for (const watch of watches) {
    const list = watchesByUser.get(watch.user) ?? [];
    list.push(watch);
    watchesByUser.set(watch.user, list);
  }

  const targets: InventoryUserTarget[] = [];
  let withGoogle = 0;
  let withRefreshToken = 0;
  let missingToken = 0;

  for (const user of users) {
    const userId = user._id.toHexString();
    const principal = toSyncPrincipal(userId);
    const googleOk = hasGoogleIdentity(user);
    const tokenOk = hasRefreshToken(user);

    if (googleOk) withGoogle += 1;
    if (tokenOk) withRefreshToken += 1;

    if (!googleOk) {
      const reason =
        user.google === undefined ? "no_google" : "empty_google_id";
      missingAuthority.push({ userId, reason });
      skips.push({
        category: "no_google_identity",
        id: userId,
        detail:
          reason === "no_google"
            ? "user has no google identity"
            : "user google.googleId is empty",
      });
    }

    if (googleOk && !tokenOk) {
      missingToken += 1;
      missingAuthority.push({ userId, reason: "empty_refresh_token" });
      skips.push({
        category: "missing_refresh_token",
        id: userId,
        detail: "user has google identity but empty gRefreshToken",
      });
    }

    const userCalendars = (calendarsByUser.get(userId) ?? []).sort((a, b) =>
      a._id.toHexString().localeCompare(b._id.toHexString()),
    );
    const calendarTargets = userCalendars
      .flatMap((c) =>
        c.source.provider === "google"
          ? [
              {
                compassCalendarId: c._id.toHexString(),
                providerCalendarId: c.source.calendarId,
              },
            ]
          : [],
      )
      .sort((a, b) => byId(a.providerCalendarId, b.providerCalendarId));

    const eventCounts = eventsByUser.get(userId) ?? {
      linkedGoogle: 0,
      unlinked: 0,
    };

    const syncDoc = syncDocByUser.get(userId);
    const userWatches = watchesByUser.get(userId) ?? [];
    const watchKeys = new Set(
      userWatches.map((w) => `${w.user}:${w.gCalendarId}`),
    );

    const syncResourceTargets: InventoryUserTarget["syncResourceTargets"] = [];
    const calendarListRows = legacyCursorRows<{
      gCalendarId?: string;
      nextSyncToken?: string;
    }>(syncDoc?.google?.calendarlist);
    if (
      calendarListRows.length > 0 ||
      watchKeys.has(`${userId}:${Resource_Sync.CALENDAR}`)
    ) {
      syncResourceTargets.push({
        resourceKind: "calendarList",
        gCalendarId: null,
        hasCursor: calendarListRows.some((r) => Boolean(r.nextSyncToken)),
        hasWatch: watchKeys.has(`${userId}:${Resource_Sync.CALENDAR}`),
      });
    }
    const eventCursorIds = new Set(
      legacyCursorRows<{ gCalendarId: string }>(syncDoc?.google?.events).map(
        (r) => r.gCalendarId,
      ),
    );
    for (const watch of userWatches) {
      if (watch.gCalendarId !== Resource_Sync.CALENDAR) {
        eventCursorIds.add(watch.gCalendarId);
      }
    }
    for (const gCalendarId of [...eventCursorIds].sort(byId)) {
      syncResourceTargets.push({
        resourceKind: "events",
        gCalendarId,
        hasCursor: legacyCursorRows<{
          gCalendarId: string;
          nextSyncToken?: string;
        }>(syncDoc?.google?.events).some(
          (r) => r.gCalendarId === gCalendarId && Boolean(r.nextSyncToken),
        ),
        hasWatch: watchKeys.has(`${userId}:${gCalendarId}`),
      });
    }

    targets.push({
      userId,
      tenantId: principal.tenantId,
      principalId: principal.principalId,
      providerAccountId: user.google?.googleId?.trim() || null,
      accountEmail: user.email ?? null,
      hasRefreshToken: tokenOk,
      calendarTargets,
      eventTargets: {
        linkedGoogle: eventCounts.linkedGoogle,
        unlinkedPendingIntent: eventCounts.unlinked,
      },
      syncResourceTargets,
    });
  }

  let eventCursorRows = 0;
  let calendarListCursorRows = 0;
  for (const doc of syncDocs) {
    eventCursorRows += legacyCursorRows(doc.google?.events).length;
    calendarListCursorRows += legacyCursorRows(doc.google?.calendarlist).length;
  }

  let eventWatches = 0;
  let calendarListWatches = 0;
  let expired = 0;
  for (const watch of watches) {
    if (watch.gCalendarId === Resource_Sync.CALENDAR) calendarListWatches += 1;
    else eventWatches += 1;
    if (isExpiredWatch(watch, now)) expired += 1;
  }

  const googleCalendars = calendars.filter(
    (c) => c.source.provider === "google",
  ).length;
  const linkedEvents = events.filter(
    (e) => e.externalReference?.provider === "google",
  ).length;

  const scanned =
    users.length +
    calendars.length +
    events.length +
    syncDocs.length +
    watches.length;

  const report: LegacySyncInventoryReport = {
    generatedAt: now.toISOString(),
    dryRun: true,
    source: {
      users: {
        total: users.length,
        withGoogle,
        withRefreshToken,
        missingToken,
      },
      calendars: {
        total: calendars.length,
        google: googleCalendars,
        local: calendars.length - googleCalendars,
      },
      events: {
        total: events.length,
        linkedGoogle: linkedEvents,
        unlinked: events.length - linkedEvents,
      },
      syncDocs: {
        total: syncDocs.length,
        eventCursorRows,
        calendarListCursorRows,
      },
      watches: {
        total: watches.length,
        eventWatches,
        calendarListWatches,
        expired,
      },
    },
    targets,
    duplicates: duplicates.sort((a, b) => byId(a.key, b.key)),
    orphans: orphans.sort((a, b) => byId(a.id, b.id)),
    missingAuthority: missingAuthority.sort((a, b) => byId(a.userId, b.userId)),
    skips: skips.sort(
      (a, b) => byId(a.category, b.category) || byId(a.id, b.id),
    ),
    counts: {
      scanned,
      reportable: targets.length,
      skipped: skips.length,
    },
  };

  return LegacySyncInventoryReportSchema.parse(report);
}

export async function loadInventoryCollections(deps: {
  user: {
    find: (q: object) => {
      toArray: () => Promise<InventoryCollections["users"]>;
    };
  };
  calendar: {
    find: (q: object) => { toArray: () => Promise<CalendarRecord[]> };
  };
  event: { find: (q: object) => { toArray: () => Promise<EventRecord[]> } };
  sync: {
    find: (q: object) => {
      toArray: () => Promise<InventoryCollections["syncDocs"]>;
    };
  };
  watch: { find: (q: object) => { toArray: () => Promise<Schema_Watch[]> } };
}): Promise<InventoryCollections> {
  const [users, calendars, events, syncDocs, watches] = await Promise.all([
    deps.user.find({}).toArray(),
    deps.calendar.find({}).toArray(),
    deps.event.find({}).toArray(),
    deps.sync.find({}).toArray(),
    deps.watch.find({}).toArray(),
  ]);
  return { users, calendars, events, syncDocs, watches };
}
