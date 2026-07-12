import { faker } from "@faker-js/faker";
import { ObjectId, type WithId } from "mongodb";
import { Resource_Sync } from "@core/types/sync.types";
import { type Schema_User } from "@core/types/user.types";
import { type Schema_Watch, WatchSchema } from "@core/types/watch.types";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { updateSync } from "@backend/sync/services/records/sync-records.repository";
import { isUsingGcalWebhookHttps } from "@backend/sync/services/watch/google-watch-config";
import {
  classifyWatchState,
  GoogleWatchStateStatus,
  inspectGoogleWatchState,
} from "@backend/sync/services/watch/google-watch-state";

jest.mock("@backend/sync/services/watch/google-watch-config", () => {
  const actual = jest.requireActual(
    "@backend/sync/services/watch/google-watch-config",
  );
  return {
    ...actual,
    isUsingGcalWebhookHttps: jest.fn(() => actual.isUsingGcalWebhookHttps()),
  };
});

// Comfortably outside SYNC_BUFFER_DAYS (3) so these watches never trip the
// "expiring soon" bucket; SOON sits inside that buffer but still in the
// future so it stays a valid, active watch.
const FAR_FUTURE = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const SOON = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

const buildGoogleCalendar = (
  userId: ObjectId,
  overrides: Partial<CalendarRecord> = {},
): CalendarRecord => ({
  _id: new ObjectId(),
  userId,
  name: "Calendar",
  description: "",
  timeZone: "America/Denver",
  foregroundColor: "#000000",
  backgroundColor: "#ffffff",
  access: "writer",
  isPrimary: false,
  isVisible: true,
  isActive: true,
  source: { provider: "google", calendarId: "cal", etag: "etag-1" },
  createdAt: new Date(),
  updatedAt: null,
  ...overrides,
});

const seedActiveGoogleCalendar = async (
  userId: ObjectId,
  gCalendarId: string,
  overrides: Partial<CalendarRecord> = {},
): Promise<CalendarRecord> => {
  const calendar = buildGoogleCalendar(userId, {
    ...overrides,
    source: { provider: "google", calendarId: gCalendarId, etag: "etag-1" },
  });
  await mongoService.calendar.insertOne(calendar);
  return calendar;
};

const seedWatch = async (
  userId: string,
  gCalendarId: string,
  overrides: Partial<Schema_Watch> = {},
): Promise<Schema_Watch> => {
  const watch = WatchSchema.parse({
    _id: new ObjectId(),
    user: userId,
    resourceId: faker.string.uuid(),
    expiration: FAR_FUTURE(),
    gCalendarId,
    createdAt: new Date(),
    ...overrides,
  });
  await mongoService.watch.insertOne(watch);
  return watch;
};

// WatchSchema's ExpirationDateSchema requires a future date (correct for a
// freshly-created watch), so an already-expired fixture can't go through
// `WatchSchema.parse` - it's inserted as a plain object instead, the same
// way inspectGoogleWatchState itself reads watches back (plain find, never
// parse - see the comment in google-watch-state.ts).
const seedExpiredWatch = async (
  userId: string,
  gCalendarId: string,
): Promise<Schema_Watch> => {
  const watch: Schema_Watch = {
    _id: new ObjectId(),
    user: userId,
    resourceId: faker.string.uuid(),
    expiration: new Date(Date.now() - 60_000),
    gCalendarId,
    createdAt: new Date(),
  };
  await mongoService.watch.insertOne(watch);
  return watch;
};

const seedCalendarlistToken = (
  userId: string,
  token: string = faker.string.alphanumeric(16),
) =>
  updateSync(Resource_Sync.CALENDAR, userId, Resource_Sync.CALENDAR, {
    nextSyncToken: token,
  });

const seedEventsSyncEntry = (
  userId: string,
  gCalendarId: string,
  token: string = faker.string.alphanumeric(16),
) =>
  updateSync(Resource_Sync.EVENTS, userId, gCalendarId, {
    nextSyncToken: token,
  });

// Mid-pagination checkpoint: a page token but no sync token yet, e.g. an
// interrupted initial import.
const seedEventsCheckpointOnly = (userId: string, gCalendarId: string) =>
  updateSync(Resource_Sync.EVENTS, userId, gCalendarId, {
    nextPageToken: faker.string.alphanumeric(12),
  });

/**
 * Seeds one active, event-capable calendar with a token-bearing events sync
 * entry and a healthy (far-future) watch; returns its Google calendar id.
 */
const seedHealthyCalendar = async (
  user: WithId<Schema_User>,
  gCalendarId: string = faker.string.uuid(),
): Promise<string> => {
  const userId = user._id.toString();
  await seedActiveGoogleCalendar(user._id, gCalendarId);
  await seedEventsSyncEntry(userId, gCalendarId);
  await seedWatch(userId, gCalendarId);
  return gCalendarId;
};

/**
 * Seeds a user with a fully healthy Google watch state: calendarlist token
 * + watch, plus `calendarCount` event-capable calendars each with a
 * token-bearing sync entry and a healthy watch.
 */
const seedHealthyUser = async (calendarCount: number) => {
  const user = await UserDriver.createUser();
  const userId = user._id.toString();

  await seedCalendarlistToken(userId);
  await seedWatch(userId, Resource_Sync.CALENDAR);

  const gCalendarIds: string[] = [];
  for (let i = 0; i < calendarCount; i += 1) {
    gCalendarIds.push(await seedHealthyCalendar(user));
  }

  return { user, userId, gCalendarIds };
};

describe("classifyWatchState", () => {
  const makeWatch = (
    gCalendarId: string,
    overrides: Partial<Schema_Watch> = {},
  ): Schema_Watch => ({
    _id: new ObjectId(),
    user: new ObjectId().toString(),
    resourceId: faker.string.uuid(),
    expiration: FAR_FUTURE(),
    gCalendarId,
    createdAt: new Date(),
    ...overrides,
  });

  // Builds an independent watch/expectation pair per requested condition so
  // each flag exercises exactly one bucket, letting the precedence tests
  // below combine/remove conditions without them interfering with each
  // other.
  const buildScenario = (flags: {
    expired?: boolean;
    missing?: boolean;
    duplicated?: boolean;
    stale?: boolean;
    expiring?: boolean;
  }) => {
    const expectedWatchCalendarIds: string[] = [];
    const watches: Schema_Watch[] = [];

    if (flags.expired) {
      expectedWatchCalendarIds.push("cal-expired");
      watches.push(
        makeWatch("cal-expired", { expiration: new Date(Date.now() - 60_000) }),
      );
    }

    if (flags.missing) {
      expectedWatchCalendarIds.push("cal-missing");
      // No watch seeded - that's what makes it missing.
    }

    if (flags.duplicated) {
      expectedWatchCalendarIds.push("cal-duplicated");
      watches.push(makeWatch("cal-duplicated"));
      watches.push(makeWatch("cal-duplicated"));
    }

    if (flags.stale) {
      // Deliberately NOT added to expectedWatchCalendarIds - that's what
      // makes it stale.
      watches.push(makeWatch("cal-stale"));
    }

    if (flags.expiring) {
      expectedWatchCalendarIds.push("cal-expiring");
      watches.push(makeWatch("cal-expiring", { expiration: SOON() }));
    }

    return { expectedWatchCalendarIds, watches };
  };

  it("case 12a: expired beats missing, duplicated, stale, and expiring", () => {
    const { expectedWatchCalendarIds, watches } = buildScenario({
      expired: true,
      missing: true,
      duplicated: true,
      stale: true,
      expiring: true,
    });

    const result = classifyWatchState({ expectedWatchCalendarIds, watches });

    expect(result.status).toBe(GoogleWatchStateStatus.REPAIR_REQUIRED);
    expect(result.reason).toBe("WATCHES_EXPIRED");
  });

  it("case 12b: missing beats duplicated, stale, and expiring when nothing is expired", () => {
    const { expectedWatchCalendarIds, watches } = buildScenario({
      missing: true,
      duplicated: true,
      stale: true,
      expiring: true,
    });

    const result = classifyWatchState({ expectedWatchCalendarIds, watches });

    expect(result.status).toBe(GoogleWatchStateStatus.REPAIR_REQUIRED);
    expect(result.reason).toBe("WATCHES_MISSING");
  });

  it("case 12c: duplicated beats stale and expiring when nothing is expired or missing", () => {
    const { expectedWatchCalendarIds, watches } = buildScenario({
      duplicated: true,
      stale: true,
      expiring: true,
    });

    const result = classifyWatchState({ expectedWatchCalendarIds, watches });

    expect(result.status).toBe(GoogleWatchStateStatus.REPAIR_REQUIRED);
    expect(result.reason).toBe("WATCHES_DUPLICATED");
  });

  it("case 12d: stale beats expiring when nothing is expired, missing, or duplicated", () => {
    const { expectedWatchCalendarIds, watches } = buildScenario({
      stale: true,
      expiring: true,
    });

    const result = classifyWatchState({ expectedWatchCalendarIds, watches });

    expect(result.status).toBe(GoogleWatchStateStatus.REPAIR_REQUIRED);
    expect(result.reason).toBe("WATCHES_STALE");
  });

  it("case 12e: expiring wins when nothing else is wrong", () => {
    const { expectedWatchCalendarIds, watches } = buildScenario({
      expiring: true,
    });

    const result = classifyWatchState({ expectedWatchCalendarIds, watches });

    expect(result.status).toBe(GoogleWatchStateStatus.REFRESH_REQUIRED);
    expect(result.reason).toBe("WATCHES_EXPIRING_SOON");
  });

  it("case 12f: healthy when a matched calendar has no issues", () => {
    const { expectedWatchCalendarIds, watches } = buildScenario({});
    expectedWatchCalendarIds.push("cal-healthy");
    watches.push(makeWatch("cal-healthy"));

    const result = classifyWatchState({ expectedWatchCalendarIds, watches });

    expect(result.status).toBe(GoogleWatchStateStatus.HEALTHY);
    expect(result.reason).toBe("WATCHES_HEALTHY");
  });
});

describe("inspectGoogleWatchState", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  it("case 1: NOT_APPLICABLE/GOOGLE_NOT_CONNECTED when the user has no google credentials", async () => {
    const user = await UserDriver.createUser({ withGoogle: false });

    const result = await inspectGoogleWatchState(user._id.toString());

    expect(result).toMatchObject({
      status: GoogleWatchStateStatus.NOT_APPLICABLE,
      reason: "GOOGLE_NOT_CONNECTED",
    });
  });

  it("case 2: NOT_APPLICABLE/PUBLIC_NOTIFICATIONS_DISABLED when the webhook baseurl isn't https", async () => {
    // Once: this test's single inspection call sees `false`; every other
    // test in the file falls through to the real (https) implementation.
    (isUsingGcalWebhookHttps as jest.Mock).mockReturnValueOnce(false);
    const user = await UserDriver.createUser();

    const result = await inspectGoogleWatchState(user._id.toString());

    expect(result).toMatchObject({
      status: GoogleWatchStateStatus.NOT_APPLICABLE,
      reason: "PUBLIC_NOTIFICATIONS_DISABLED",
    });
  });

  it("case 3: FULL_REPAIR_REQUIRED/SYNC_RECORD_MISSING when there is no sync record", async () => {
    const user = await UserDriver.createUser();

    const result = await inspectGoogleWatchState(user._id.toString());

    expect(result).toMatchObject({
      status: GoogleWatchStateStatus.FULL_REPAIR_REQUIRED,
      reason: "SYNC_RECORD_MISSING",
    });
  });

  it("case 4: FULL_REPAIR_REQUIRED/SYNC_TOKEN_MISSING when the calendarlist sync entry has no token", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();
    // Creates sync.google (via the events array) without ever seeding a
    // calendarlist entry.
    await seedEventsSyncEntry(userId, faker.string.uuid());

    const result = await inspectGoogleWatchState(userId);

    expect(result).toMatchObject({
      status: GoogleWatchStateStatus.FULL_REPAIR_REQUIRED,
      reason: "SYNC_TOKEN_MISSING",
    });
  });

  it("case 5: FULL_REPAIR_REQUIRED/SYNC_INCOMPLETE for event-capable calendars with no token-bearing events entry (absent, and checkpoint-only)", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();
    await seedCalendarlistToken(userId);

    const absentEntryGCalId = faker.string.uuid();
    await seedActiveGoogleCalendar(user._id, absentEntryGCalId);
    // No events sync entry at all for this one.

    const checkpointOnlyGCalId = faker.string.uuid();
    await seedActiveGoogleCalendar(user._id, checkpointOnlyGCalId);
    await seedEventsCheckpointOnly(userId, checkpointOnlyGCalId);

    const result = await inspectGoogleWatchState(userId);

    expect(result.status).toBe(GoogleWatchStateStatus.FULL_REPAIR_REQUIRED);
    expect(result.reason).toBe("SYNC_INCOMPLETE");
    expect([...result.incompleteCalendarIds].sort()).toEqual(
      [absentEntryGCalId, checkpointOnlyGCalId].sort(),
    );
  });

  it("case 6a: HEALTHY with one event-capable calendar", async () => {
    const { userId, gCalendarIds } = await seedHealthyUser(1);

    const result = await inspectGoogleWatchState(userId);

    expect(result.status).toBe(GoogleWatchStateStatus.HEALTHY);
    expect(result.reason).toBe("WATCHES_HEALTHY");
    expect(result.expectedWatchCalendarIds.sort()).toEqual(
      [Resource_Sync.CALENDAR, ...gCalendarIds].sort(),
    );
  });

  it("case 6b: HEALTHY with three event-capable calendars", async () => {
    const { userId, gCalendarIds } = await seedHealthyUser(3);

    const result = await inspectGoogleWatchState(userId);

    expect(result.status).toBe(GoogleWatchStateStatus.HEALTHY);
    expect(result.reason).toBe("WATCHES_HEALTHY");
    expect(result.expectedWatchCalendarIds.sort()).toEqual(
      [Resource_Sync.CALENDAR, ...gCalendarIds].sort(),
    );
  });

  it("case 6c: HEALTHY with zero event-capable calendars (expected set is just the calendarlist watch)", async () => {
    const { userId } = await seedHealthyUser(0);

    const result = await inspectGoogleWatchState(userId);

    expect(result.status).toBe(GoogleWatchStateStatus.HEALTHY);
    expect(result.reason).toBe("WATCHES_HEALTHY");
    expect(result.expectedWatchCalendarIds).toEqual([Resource_Sync.CALENDAR]);
  });

  it("case 7: a freeBusyReader calendar's lingering watch is stale, and the calendar is excluded from the expected set", async () => {
    const { user, userId } = await seedHealthyUser(0);
    const gCalendarId = faker.string.uuid();
    await seedActiveGoogleCalendar(user._id, gCalendarId, {
      access: "freeBusyReader",
    });
    await seedWatch(userId, gCalendarId);

    const result = await inspectGoogleWatchState(userId);

    expect(result.status).toBe(GoogleWatchStateStatus.REPAIR_REQUIRED);
    expect(result.reason).toBe("WATCHES_STALE");
    expect(result.staleWatches.map((w) => w.gCalendarId)).toEqual([
      gCalendarId,
    ]);
    expect(result.expectedWatchCalendarIds).toEqual([Resource_Sync.CALENDAR]);
  });

  it("case 8: an archived calendar's lingering watch is stale", async () => {
    const { user, userId } = await seedHealthyUser(0);
    const gCalendarId = faker.string.uuid();
    await seedActiveGoogleCalendar(user._id, gCalendarId, {
      isActive: false,
    });
    await seedWatch(userId, gCalendarId);

    const result = await inspectGoogleWatchState(userId);

    expect(result.status).toBe(GoogleWatchStateStatus.REPAIR_REQUIRED);
    expect(result.reason).toBe("WATCHES_STALE");
    expect(result.staleWatches.map((w) => w.gCalendarId)).toEqual([
      gCalendarId,
    ]);
  });

  it("case 9: an expired expected watch triggers REPAIR_REQUIRED/WATCHES_EXPIRED and appears in expiredWatches", async () => {
    const { userId, gCalendarIds } = await seedHealthyUser(1);
    const gCalendarId = gCalendarIds[0]!;
    // Replace the healthy events watch seeded by seedHealthyUser with an
    // already-expired one for the same calendar.
    await mongoService.watch.deleteOne({ user: userId, gCalendarId });
    const expiredWatch = await seedExpiredWatch(userId, gCalendarId);

    const result = await inspectGoogleWatchState(userId);

    expect(result.status).toBe(GoogleWatchStateStatus.REPAIR_REQUIRED);
    expect(result.reason).toBe("WATCHES_EXPIRED");
    expect(result.expiredWatches.map((w) => w._id.toString())).toContain(
      expiredWatch._id.toString(),
    );
  });

  it("case 10: a missing expected watch triggers REPAIR_REQUIRED/WATCHES_MISSING with its id in missingWatchCalendarIds", async () => {
    const { userId, gCalendarIds } = await seedHealthyUser(1);
    const gCalendarId = gCalendarIds[0]!;
    await mongoService.watch.deleteOne({ user: userId, gCalendarId });

    const result = await inspectGoogleWatchState(userId);

    expect(result.status).toBe(GoogleWatchStateStatus.REPAIR_REQUIRED);
    expect(result.reason).toBe("WATCHES_MISSING");
    expect(result.missingWatchCalendarIds).toEqual([gCalendarId]);
  });

  it("case 11: a watch expiring inside the renew buffer triggers REFRESH_REQUIRED/WATCHES_EXPIRING_SOON", async () => {
    const { userId, gCalendarIds } = await seedHealthyUser(1);
    const gCalendarId = gCalendarIds[0]!;
    await mongoService.watch.updateOne(
      { user: userId, gCalendarId },
      { $set: { expiration: SOON() } },
    );

    const result = await inspectGoogleWatchState(userId);

    expect(result.status).toBe(GoogleWatchStateStatus.REFRESH_REQUIRED);
    expect(result.reason).toBe("WATCHES_EXPIRING_SOON");
    expect(result.watchesToRefresh.map((w) => w.gCalendarId)).toEqual([
      gCalendarId,
    ]);
  });

  it("case 13: makes zero Google API calls during a full inspection", async () => {
    const { userId } = await seedHealthyUser(2);
    const getEventsSpy = jest.spyOn(gcalService, "getEvents");
    const watchEventsSpy = jest.spyOn(gcalService, "watchEvents");
    const watchCalendarsSpy = jest.spyOn(gcalService, "watchCalendars");
    const stopWatchSpy = jest.spyOn(gcalService, "stopWatch");

    const result = await inspectGoogleWatchState(userId);

    expect(result.status).toBe(GoogleWatchStateStatus.HEALTHY);
    expect(getEventsSpy).not.toHaveBeenCalled();
    expect(watchEventsSpy).not.toHaveBeenCalled();
    expect(watchCalendarsSpy).not.toHaveBeenCalled();
    expect(stopWatchSpy).not.toHaveBeenCalled();
  });
});
