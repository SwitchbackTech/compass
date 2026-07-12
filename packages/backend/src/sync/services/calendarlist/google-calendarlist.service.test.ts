import { faker } from "@faker-js/faker";
import { ObjectId } from "mongodb";
import { createMockCalendarListEntry } from "@core/__tests__/helpers/gcal.factory";
import { Resource_Sync } from "@core/types/sync.types";
import { WatchSchema } from "@core/types/watch.types";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { compassTestState } from "@backend/__tests__/helpers/mock.setup";
import { createGoogleError } from "@backend/__tests__/mocks.gcal/errors/error.google.factory";
import { invalidSyncTokenError } from "@backend/__tests__/mocks.gcal/errors/error.invalidSyncToken";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import { createGoogleRequestContext } from "@backend/common/services/gcal/gcal.context";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { type EventRecord } from "@backend/event/event.record";
import { sseServer } from "@backend/servers/sse/sse.server";
import { googleCalendarListService } from "@backend/sync/services/calendarlist/google-calendarlist.service";
import { seedLocalCalendar } from "@backend/sync/services/event-propagation/__tests__/event-propagation.test-helpers";
import * as syncImportService from "@backend/sync/services/import/google-import.service";
import { updateSync } from "@backend/sync/services/records/sync-records.repository";

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

const buildEvent = (
  calendarId: ObjectId,
  overrides: Partial<EventRecord> = {},
): EventRecord => ({
  _id: new ObjectId(),
  calendarId,
  content: { kind: "details", title: "Event", description: "" },
  schedule: {
    kind: "timed",
    start: new Date("2026-01-15T10:00:00.000Z"),
    end: new Date("2026-01-15T11:00:00.000Z"),
    timeZone: "America/Denver",
  },
  recurrence: { kind: "single" },
  priority: "unassigned",
  externalReference: null,
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

const seedEventsSyncEntry = (userId: string, gCalendarId: string) =>
  updateSync(Resource_Sync.EVENTS, userId, gCalendarId, {
    nextSyncToken: faker.string.alphanumeric(16),
  });

const seedWatch = async (userId: string, gCalendarId: string) => {
  const watch = WatchSchema.parse({
    _id: new ObjectId(),
    user: userId,
    resourceId: faker.string.uuid(),
    expiration: new Date(Date.now() + 60_000),
    gCalendarId,
    createdAt: new Date(),
  });
  await mongoService.watch.insertOne(watch);
  return watch;
};

const seedCalendarlistToken = async (userId: string): Promise<string> => {
  const token = faker.string.alphanumeric(16);
  await updateSync(Resource_Sync.CALENDAR, userId, Resource_Sync.CALENDAR, {
    nextSyncToken: token,
  });
  return token;
};

const getCalendarlistToken = async (userId: string) => {
  const sync = await mongoService.sync.findOne({ user: userId });
  return sync?.google?.calendarlist?.find(
    (entry) => entry.gCalendarId === Resource_Sync.CALENDAR,
  )?.nextSyncToken;
};

const getEventsSyncGCalIds = async (userId: string) => {
  const sync = await mongoService.sync.findOne({ user: userId });
  return sync?.google?.events?.map((entry) => entry.gCalendarId) ?? [];
};

const reconcile = async (userId: string) => {
  const context = await createGoogleRequestContext(userId);
  return googleCalendarListService.reconcileCalendarList(context, userId);
};

describe("googleCalendarListService", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  describe("reconcileCalendarList", () => {
    it("imports a newly-added writer calendar: row, events, watch, sync entry, and SSE", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const initialToken = await seedCalendarlistToken(userId);

      compassTestState().calendarlist = [
        createMockCalendarListEntry({
          id: "new-cal",
          primary: false,
          selected: true,
          accessRole: "writer",
        }),
      ];

      const calendarsChangedSpy = jest.spyOn(
        sseServer,
        "publishCalendarsChanged",
      );
      const eventsChangedSpy = jest.spyOn(sseServer, "publishEventsChanged");

      const result = await reconcile(userId);

      expect(result).toEqual({ outcome: "RECONCILED" });

      const row = await mongoService.calendar.findOne({
        userId: user._id,
        "source.calendarId": "new-cal",
      });
      expect(row?.isActive).toBe(true);

      const events = await mongoService.event
        .find({ calendarId: row!._id })
        .toArray();
      expect(events.length).toBeGreaterThan(0);

      const eventsSyncGCalIds = await getEventsSyncGCalIds(userId);
      expect(eventsSyncGCalIds).toContain("new-cal");

      const watch = await mongoService.watch.findOne({
        user: userId,
        gCalendarId: "new-cal",
      });
      expect(watch).not.toBeNull();

      expect(calendarsChangedSpy).toHaveBeenCalledWith(
        userId,
        expect.arrayContaining([row!._id.toHexString()]),
      );
      expect(eventsChangedSpy).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          calendarId: row!._id.toHexString(),
          reason: "reconciled",
        }),
      );

      const newToken = await getCalendarlistToken(userId);
      expect(newToken).toBeTruthy();
      expect(newToken).not.toBe(initialToken);
    });

    it("applies metadata changes without touching isVisible, _id, or triggering a re-import", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const existing = await seedActiveGoogleCalendar(
        user._id,
        "existing-cal",
        {
          name: "Old Name",
          isVisible: false,
        },
      );
      await seedEventsSyncEntry(userId, "existing-cal");
      await seedCalendarlistToken(userId);

      compassTestState().calendarlist = [
        createMockCalendarListEntry({
          id: "existing-cal",
          summary: "New Name",
          backgroundColor: "#123456",
          selected: true,
          accessRole: "writer",
          primary: false,
        }),
      ];

      const getEventsSpy = jest.spyOn(gcalService, "getEvents");

      const result = await reconcile(userId);

      expect(result).toEqual({ outcome: "RECONCILED" });
      expect(getEventsSpy).not.toHaveBeenCalled();

      const updated = await mongoService.calendar.findOne({
        _id: existing._id,
      });
      expect(updated?.name).toBe("New Name");
      expect(updated?.backgroundColor).toBe("#123456");
      expect(updated?.isVisible).toBe(false);
      expect(updated?._id).toEqual(existing._id);
    });

    it.each([
      { label: "hidden", field: "hidden" as const },
      { label: "deleted", field: "deleted" as const },
    ])("archives a $label calendar and tears down its watch/sync entry/events, leaving other calendars intact", async ({
      field,
    }) => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      const calA = await seedActiveGoogleCalendar(user._id, "cal-a");
      const calB = await seedActiveGoogleCalendar(user._id, "cal-b");
      await seedEventsSyncEntry(userId, "cal-a");
      await seedEventsSyncEntry(userId, "cal-b");
      await seedWatch(userId, "cal-a");
      await seedWatch(userId, "cal-b");
      await mongoService.event.insertMany([
        buildEvent(calA._id),
        buildEvent(calA._id),
      ]);
      await mongoService.event.insertMany([buildEvent(calB._id)]);
      await seedCalendarlistToken(userId);

      compassTestState().calendarlist = [
        createMockCalendarListEntry({
          id: "cal-a",
          primary: false,
          [field]: true,
        }),
      ];

      const stopWatchSpy = jest.spyOn(gcalService, "stopWatch");
      const calendarsChangedSpy = jest.spyOn(
        sseServer,
        "publishCalendarsChanged",
      );

      await expect(reconcile(userId)).resolves.toEqual({
        outcome: "RECONCILED",
      });

      const rowA = await mongoService.calendar.findOne({ _id: calA._id });
      expect(rowA?.isActive).toBe(false);

      expect(stopWatchSpy).toHaveBeenCalled();
      expect(
        await mongoService.watch.findOne({
          user: userId,
          gCalendarId: "cal-a",
        }),
      ).toBeNull();
      expect(
        await mongoService.watch.findOne({
          user: userId,
          gCalendarId: "cal-b",
        }),
      ).not.toBeNull();

      const eventsSyncGCalIds = await getEventsSyncGCalIds(userId);
      expect(eventsSyncGCalIds).not.toContain("cal-a");
      expect(eventsSyncGCalIds).toContain("cal-b");
      expect(await getCalendarlistToken(userId)).toBeTruthy();

      expect(
        await mongoService.event.countDocuments({ calendarId: calA._id }),
      ).toBe(0);
      expect(
        await mongoService.event.countDocuments({ calendarId: calB._id }),
      ).toBe(1);

      expect(calendarsChangedSpy).toHaveBeenCalledWith(
        userId,
        expect.arrayContaining([calA._id.toHexString()]),
      );
    });

    it("tears down event machinery when an existing calendar's role drops to freeBusyReader, keeping the row active", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      const cal = await seedActiveGoogleCalendar(user._id, "cal-a", {
        access: "writer",
      });
      await seedEventsSyncEntry(userId, "cal-a");
      await seedWatch(userId, "cal-a");
      await mongoService.event.insertMany([buildEvent(cal._id)]);
      await seedCalendarlistToken(userId);

      compassTestState().calendarlist = [
        createMockCalendarListEntry({
          id: "cal-a",
          primary: false,
          selected: true,
          accessRole: "freeBusyReader",
        }),
      ];

      const stopWatchSpy = jest.spyOn(gcalService, "stopWatch");

      await expect(reconcile(userId)).resolves.toEqual({
        outcome: "RECONCILED",
      });

      const row = await mongoService.calendar.findOne({ _id: cal._id });
      expect(row?.isActive).toBe(true);
      expect(row?.access).toBe("freeBusyReader");

      expect(stopWatchSpy).toHaveBeenCalled();
      expect(
        await mongoService.watch.findOne({
          user: userId,
          gCalendarId: "cal-a",
        }),
      ).toBeNull();

      const eventsSyncGCalIds = await getEventsSyncGCalIds(userId);
      expect(eventsSyncGCalIds).not.toContain("cal-a");

      expect(
        await mongoService.event.countDocuments({ calendarId: cal._id }),
      ).toBe(0);
    });

    it("imports events and starts a watch when an existing freeBusyReader calendar's role is upgraded", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      const cal = await seedActiveGoogleCalendar(user._id, "cal-a", {
        access: "freeBusyReader",
      });
      await seedCalendarlistToken(userId);

      compassTestState().calendarlist = [
        createMockCalendarListEntry({
          id: "cal-a",
          primary: false,
          selected: true,
          accessRole: "writer",
        }),
      ];

      await expect(reconcile(userId)).resolves.toEqual({
        outcome: "RECONCILED",
      });

      const row = await mongoService.calendar.findOne({ _id: cal._id });
      expect(row?.access).toBe("writer");
      expect(row?.isActive).toBe(true);

      const eventsSyncGCalIds = await getEventsSyncGCalIds(userId);
      expect(eventsSyncGCalIds).toContain("cal-a");

      const watch = await mongoService.watch.findOne({
        user: userId,
        gCalendarId: "cal-a",
      });
      expect(watch).not.toBeNull();
    });

    it("clears isPrimary from the previous primary when a delta marks a different calendar primary", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      const calA = await seedActiveGoogleCalendar(user._id, "cal-a", {
        isPrimary: true,
      });
      const calB = await seedActiveGoogleCalendar(user._id, "cal-b", {
        isPrimary: false,
      });
      await seedEventsSyncEntry(userId, "cal-a");
      await seedEventsSyncEntry(userId, "cal-b");
      await seedCalendarlistToken(userId);

      compassTestState().calendarlist = [
        createMockCalendarListEntry({
          id: "cal-b",
          primary: true,
          selected: true,
          accessRole: "writer",
        }),
      ];

      await expect(reconcile(userId)).resolves.toEqual({
        outcome: "RECONCILED",
      });

      const updatedA = await mongoService.calendar.findOne({ _id: calA._id });
      const updatedB = await mongoService.calendar.findOne({ _id: calB._id });
      expect(updatedA?.isPrimary).toBe(false);
      expect(updatedB?.isPrimary).toBe(true);
    });

    it("re-adding a calendar after archiving it reuses the Compass id, preserves visibility, and reimports events", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      const cal = await seedActiveGoogleCalendar(user._id, "cal-a", {
        isVisible: false,
      });
      await seedEventsSyncEntry(userId, "cal-a");
      await mongoService.event.insertMany([buildEvent(cal._id)]);
      await seedCalendarlistToken(userId);

      compassTestState().calendarlist = [
        createMockCalendarListEntry({
          id: "cal-a",
          primary: false,
          deleted: true,
        }),
      ];
      await expect(reconcile(userId)).resolves.toEqual({
        outcome: "RECONCILED",
      });

      const archived = await mongoService.calendar.findOne({ _id: cal._id });
      expect(archived?.isActive).toBe(false);

      compassTestState().calendarlist = [
        createMockCalendarListEntry({
          id: "cal-a",
          primary: false,
          selected: true,
          accessRole: "writer",
        }),
      ];
      await expect(reconcile(userId)).resolves.toEqual({
        outcome: "RECONCILED",
      });

      const readded = await mongoService.calendar.findOne({
        userId: user._id,
        "source.calendarId": "cal-a",
      });
      expect(readded?._id).toEqual(cal._id);
      expect(readded?.isActive).toBe(true);
      expect(readded?.isVisible).toBe(false);

      const events = await mongoService.event
        .find({ calendarId: cal._id })
        .toArray();
      expect(events.length).toBeGreaterThan(0);
    });

    it("applies every entry across a multi-page delta and advances the token", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const initialToken = await seedCalendarlistToken(userId);

      // freeBusyReader keeps this test focused on pagination rather than
      // fanning out 7 real event imports.
      compassTestState().calendarlist = Array.from({ length: 7 }, (_, i) =>
        createMockCalendarListEntry({
          id: `cal-${i}`,
          primary: false,
          selected: true,
          accessRole: "freeBusyReader",
        }),
      );

      const result = await reconcile(userId);
      expect(result).toEqual({ outcome: "RECONCILED" });

      const rows = await mongoService.calendar
        .find({ userId: user._id, "source.provider": "google" })
        .toArray();
      expect(rows).toHaveLength(7);

      const newToken = await getCalendarlistToken(userId);
      expect(newToken).toBeTruthy();
      expect(newToken).not.toBe(initialToken);
    });

    it("converges when the same delta is delivered twice: no duplicate rows or watches, stable event count", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      await seedCalendarlistToken(userId);

      compassTestState().calendarlist = [
        createMockCalendarListEntry({
          id: "cal-a",
          primary: false,
          selected: true,
          accessRole: "writer",
        }),
      ];

      await expect(reconcile(userId)).resolves.toEqual({
        outcome: "RECONCILED",
      });
      const rowsAfterFirst = await mongoService.calendar
        .find({ userId: user._id, "source.provider": "google" })
        .toArray();
      const watchesAfterFirst = await mongoService.watch
        .find({ user: userId })
        .toArray();
      const eventsAfterFirst = await mongoService.event.countDocuments({
        calendarId: rowsAfterFirst[0]!._id,
      });

      await expect(reconcile(userId)).resolves.toEqual({
        outcome: "RECONCILED",
      });
      const rowsAfterSecond = await mongoService.calendar
        .find({ userId: user._id, "source.provider": "google" })
        .toArray();
      const watchesAfterSecond = await mongoService.watch
        .find({ user: userId })
        .toArray();
      const eventsAfterSecond = await mongoService.event.countDocuments({
        calendarId: rowsAfterFirst[0]!._id,
      });

      expect(rowsAfterSecond).toHaveLength(rowsAfterFirst.length);
      expect(watchesAfterSecond).toHaveLength(watchesAfterFirst.length);
      expect(eventsAfterSecond).toBe(eventsAfterFirst);
    });

    it("resumes an interrupted import on redelivery instead of treating the checkpoint as complete", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const cal = await seedActiveGoogleCalendar(user._id, "cal-a");
      // A mid-failed import leaves an events entry holding only its
      // nextPageToken checkpoint - no nextSyncToken. The gcal mock reads
      // page tokens as numeric offsets, so "0" resumes from the start.
      await updateSync(Resource_Sync.EVENTS, userId, "cal-a", {
        nextPageToken: "0",
      });
      await seedCalendarlistToken(userId);

      compassTestState().calendarlist = [
        createMockCalendarListEntry({
          id: "cal-a",
          primary: false,
          selected: true,
          accessRole: "writer",
        }),
      ];

      await expect(reconcile(userId)).resolves.toEqual({
        outcome: "RECONCILED",
      });

      const sync = await mongoService.sync.findOne({ user: userId });
      const entry = sync?.google?.events?.find(
        (e) => e.gCalendarId === "cal-a",
      );
      expect(entry?.nextSyncToken).toBeTruthy();
      expect(
        await mongoService.event.countDocuments({ calendarId: cal._id }),
      ).toBeGreaterThan(0);
    });

    it("does not advance the calendarlist token when a new calendar's import fails", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const initialToken = await seedCalendarlistToken(userId);

      compassTestState().calendarlist = [
        createMockCalendarListEntry({
          id: "broken-cal",
          primary: false,
          selected: true,
          accessRole: "writer",
        }),
      ];

      jest.spyOn(syncImportService, "createSyncImport").mockResolvedValue({
        importAllEvents: jest
          .fn()
          .mockRejectedValue(new Error("simulated import failure")),
      } as unknown as Awaited<
        ReturnType<typeof syncImportService.createSyncImport>
      >);

      await expect(reconcile(userId)).rejects.toThrow(
        "simulated import failure",
      );

      const tokenAfterFailure = await getCalendarlistToken(userId);
      expect(tokenAfterFailure).toBe(initialToken);
    });

    it("returns IGNORED for an empty delta, publishes no SSE, and still refreshes the token", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const initialToken = await seedCalendarlistToken(userId);

      compassTestState().calendarlist = [];

      const calendarsChangedSpy = jest.spyOn(
        sseServer,
        "publishCalendarsChanged",
      );
      const eventsChangedSpy = jest.spyOn(sseServer, "publishEventsChanged");

      await expect(reconcile(userId)).resolves.toEqual({
        outcome: "IGNORED",
      });

      expect(calendarsChangedSpy).not.toHaveBeenCalled();
      expect(eventsChangedSpy).not.toHaveBeenCalled();

      const tokenAfter = await getCalendarlistToken(userId);
      expect(tokenAfter).not.toBe(initialToken);
    });

    it("serializes concurrent reconcile calls for the same user without producing duplicate rows or watches", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      await seedCalendarlistToken(userId);

      compassTestState().calendarlist = [
        createMockCalendarListEntry({
          id: "cal-a",
          primary: false,
          selected: true,
          accessRole: "writer",
        }),
      ];

      const context = await createGoogleRequestContext(userId);
      const [first, second] = await Promise.all([
        googleCalendarListService.reconcileCalendarList(context, userId),
        googleCalendarListService.reconcileCalendarList(context, userId),
      ]);

      expect(first).toEqual({ outcome: "RECONCILED" });
      expect(second).toEqual({ outcome: "RECONCILED" });

      const rows = await mongoService.calendar
        .find({
          userId: user._id,
          "source.provider": "google",
          "source.calendarId": "cal-a",
        })
        .toArray();
      expect(rows).toHaveLength(1);

      const watches = await mongoService.watch
        .find({ user: userId, gCalendarId: "cal-a" })
        .toArray();
      expect(watches).toHaveLength(1);
    });
  });

  describe("410 recovery: targeted full-list rebuild", () => {
    it("rebuilds from a full CalendarList fetch when the stored token is rejected, preserving survivors (events/token/watch/visibility) and Compass-local data, while archiving what disappeared (visibility preserved)", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      // isVisible: false on both proves visibility survives each path this
      // recovery can take: cal-a survives via the upsert path, cal-b is
      // torn down via the removal path.
      const calA = await seedActiveGoogleCalendar(user._id, "cal-a", {
        isVisible: false,
      });
      const calB = await seedActiveGoogleCalendar(user._id, "cal-b", {
        isVisible: false,
      });
      await seedEventsSyncEntry(userId, "cal-a");
      await seedEventsSyncEntry(userId, "cal-b");
      await seedWatch(userId, "cal-a");
      await seedWatch(userId, "cal-b");
      await mongoService.event.insertMany([
        buildEvent(calA._id),
        buildEvent(calA._id),
      ]);
      await mongoService.event.insertMany([buildEvent(calB._id)]);

      const localCalendar = await seedLocalCalendar(user._id);
      await mongoService.event.insertOne(buildEvent(localCalendar._id));

      const initialToken = await seedCalendarlistToken(userId);

      // The full list Google serves once cal-b has disappeared: only cal-a
      // remains.
      compassTestState().calendarlist = [
        createMockCalendarListEntry({
          id: "cal-a",
          primary: false,
          selected: true,
          accessRole: "writer",
        }),
      ];

      jest
        .spyOn(gcalService, "getAllCalendarListPages")
        .mockImplementationOnce(() => {
          throw invalidSyncTokenError;
        });

      const stopWatchSpy = jest.spyOn(gcalService, "stopWatch");

      const result = await reconcile(userId);

      expect(result).toEqual({ outcome: "RECONCILED" });

      // cal-a survives untouched: active, events intact, sync entry +
      // watch intact, visibility preserved.
      const rowA = await mongoService.calendar.findOne({ _id: calA._id });
      expect(rowA?.isActive).toBe(true);
      expect(rowA?.isVisible).toBe(false);
      expect(
        await mongoService.event.countDocuments({ calendarId: calA._id }),
      ).toBe(2);
      const eventsSyncGCalIds = await getEventsSyncGCalIds(userId);
      expect(eventsSyncGCalIds).toContain("cal-a");
      expect(
        await mongoService.watch.findOne({
          user: userId,
          gCalendarId: "cal-a",
        }),
      ).not.toBeNull();

      // cal-b was archived: watch stopped, events sync entry pulled,
      // events deleted, but visibility preserved on the archived row.
      const rowB = await mongoService.calendar.findOne({ _id: calB._id });
      expect(rowB?.isActive).toBe(false);
      expect(rowB?.isVisible).toBe(false);
      expect(stopWatchSpy).toHaveBeenCalled();
      expect(
        await mongoService.watch.findOne({
          user: userId,
          gCalendarId: "cal-b",
        }),
      ).toBeNull();
      expect(eventsSyncGCalIds).not.toContain("cal-b");
      expect(
        await mongoService.event.countDocuments({ calendarId: calB._id }),
      ).toBe(0);

      // Compass-local data is untouched by the recovery.
      expect(
        await mongoService.calendar.findOne({ _id: localCalendar._id }),
      ).not.toBeNull();
      expect(
        await mongoService.event.countDocuments({
          calendarId: localCalendar._id,
        }),
      ).toBe(1);

      // The stored token was replaced by the recovery fetch's token, not
      // the (rejected) one Google returned the 410 for.
      const newToken = await getCalendarlistToken(userId);
      expect(newToken).toBeTruthy();
      expect(newToken).not.toBe(initialToken);
    });

    it("propagates a non-410 calendarlist fetch error without recovering and without touching the stored token", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const initialToken = await seedCalendarlistToken(userId);

      jest
        .spyOn(gcalService, "getAllCalendarListPages")
        .mockImplementationOnce(() => {
          throw createGoogleError({ code: "500", responseStatus: 500 });
        });

      await expect(reconcile(userId)).rejects.toMatchObject({ code: "500" });

      expect(await getCalendarlistToken(userId)).toBe(initialToken);
    });
  });
});
