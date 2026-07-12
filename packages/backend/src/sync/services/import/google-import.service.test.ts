import { ObjectId } from "mongodb";
import { type gCalendar } from "@core/types/gcal";
import { Resource_Sync } from "@core/types/sync.types";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import {
  mockRecurringGcalEvents,
  mockRegularGcalEvent,
} from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import { type GoogleRequestContext } from "@backend/common/services/gcal/gcal.context";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { SyncImport } from "@backend/sync/services/import/google-import.service";
import {
  getGCalEventsSyncPageToken,
  getSync,
  updateSync,
} from "@backend/sync/services/records/sync-records.repository";

jest.mock("@backend/common/services/gcal/gcal.service", () => ({
  __esModule: true,
  default: {
    getAllEvents: jest.fn(),
    getEvents: jest.fn(),
    getBaseRecurringEventInstances: jest.fn(),
  },
}));

const asPages = async function* (
  ...pages: Array<{
    items: unknown[];
    nextPageToken?: string;
    nextSyncToken?: string;
  }>
) {
  for (const page of pages) yield page;
};

const asInstancePage = async function* (items: unknown[]) {
  yield { items };
};

const buildCalendar = (userId: ObjectId): CalendarRecord => ({
  _id: new ObjectId(),
  userId,
  name: "Primary",
  description: "",
  timeZone: "America/Denver",
  foregroundColor: "#000000",
  backgroundColor: "#ffffff",
  access: "owner",
  isPrimary: true,
  isVisible: true,
  isActive: true,
  source: { provider: "google", calendarId: "primary", etag: "etag-1" },
  createdAt: new Date(),
  updatedAt: null,
});

describe("SyncImport", () => {
  let calendar: CalendarRecord;
  let userId: string;
  const gcal = {} as gCalendar;
  const context: GoogleRequestContext = { gcal, quotaUser: "user-1" };

  beforeAll(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  beforeEach(async () => {
    // The sync collection is intentionally excluded from cleanupCollections
    // (mock.db.setup.ts), so each test uses a fresh userId to avoid
    // inheriting a leftover sync token from a previous test.
    userId = new ObjectId().toString();
    calendar = buildCalendar(new ObjectId(userId));
    await mongoService.calendar.insertOne(calendar);
    (gcalService.getAllEvents as jest.Mock).mockReset();
    (gcalService.getEvents as jest.Mock).mockReset();
    (gcalService.getBaseRecurringEventInstances as jest.Mock).mockReset();
  });

  describe("importAllEvents", () => {
    it("imports the base and materializes its instances", async () => {
      const { base, instances } = mockRecurringGcalEvents();
      (gcalService.getAllEvents as jest.Mock).mockReturnValue(
        asPages({
          items: [base],
          nextSyncToken: "sync-token-1",
        }),
      );
      (gcalService.getBaseRecurringEventInstances as jest.Mock).mockReturnValue(
        asInstancePage(instances),
      );

      const syncImport = new SyncImport(context);
      const result = await syncImport.importAllEvents(userId, calendar, 1000);

      expect(result.totalSaved).toBe(1 + instances.length);
      expect(result.nextSyncToken).toBe("sync-token-1");

      const baseRecord = await mongoService.event.findOne({
        "externalReference.eventId": base.id,
      });
      expect(baseRecord?.recurrence.kind).toBe("series");

      const instanceRecords = await mongoService.event
        .find({ "recurrence.kind": "occurrence" })
        .toArray();
      expect(instanceRecords).toHaveLength(instances.length);
    });

    it("does not create duplicate events on a repeated import of the same events", async () => {
      const gEvent = mockRegularGcalEvent();
      (gcalService.getAllEvents as jest.Mock)
        .mockReturnValueOnce(
          asPages({ items: [gEvent], nextSyncToken: "sync-token-1" }),
        )
        .mockReturnValueOnce(
          asPages({ items: [gEvent], nextSyncToken: "sync-token-2" }),
        );

      const syncImport = new SyncImport(context);
      await syncImport.importAllEvents(userId, calendar, 1000);
      await syncImport.importAllEvents(userId, calendar, 1000);

      const stored = await mongoService.event
        .find({ "externalReference.eventId": gEvent.id })
        .toArray();
      expect(stored).toHaveLength(1);
    });

    it("skips cancelled events and does not save them", async () => {
      const gEvent = mockRegularGcalEvent({ status: "cancelled" });
      (gcalService.getAllEvents as jest.Mock).mockReturnValue(
        asPages({ items: [gEvent], nextSyncToken: "sync-token-1" }),
      );

      const syncImport = new SyncImport(context);
      const result = await syncImport.importAllEvents(userId, calendar, 1000);

      expect(result.totalSaved).toBe(0);
      expect(
        await mongoService.event.countDocuments({
          "externalReference.eventId": gEvent.id,
        }),
      ).toBe(0);
    });

    it("retains already-persisted pages and their pageToken checkpoint when a later page throws, then resumes on retry without duplicating or advancing the sync token prematurely", async () => {
      const page1Event = mockRegularGcalEvent({ id: "page-1-event" });
      const page2Event = mockRegularGcalEvent({ id: "page-2-event" });

      const throwOnPage2 = async function* () {
        yield { items: [page1Event], nextPageToken: "page-2-token" };
        throw new Error("simulated network failure fetching page 2");
      };
      (gcalService.getAllEvents as jest.Mock).mockReturnValueOnce(
        throwOnPage2(),
      );

      const syncImport = new SyncImport(context);

      await expect(
        syncImport.importAllEvents(userId, calendar, 1000),
      ).rejects.toThrow("simulated network failure fetching page 2");

      // Page 1's event and its pageToken checkpoint are durably saved even
      // though the overall import threw - no surrounding transaction to
      // roll them back.
      expect(
        await mongoService.event.countDocuments({
          "externalReference.eventId": page1Event.id,
        }),
      ).toBe(1);

      const pageTokenAfterFailure = await getGCalEventsSyncPageToken(
        userId,
        calendar.source.provider === "google" ? calendar.source.calendarId : "",
      );
      expect(pageTokenAfterFailure).toBe("page-2-token");

      // The sync token must not have advanced past the unpersisted page.
      const syncAfterFailure = await getSync({ userId });
      const eventSyncAfterFailure = syncAfterFailure?.google?.events?.find(
        (e) => e.gCalendarId === "primary",
      );
      expect(eventSyncAfterFailure?.nextSyncToken).toBeUndefined();

      // A retry resumes from the saved pageToken rather than page 1.
      (gcalService.getAllEvents as jest.Mock).mockReturnValueOnce(
        asPages({ items: [page2Event], nextSyncToken: "final-sync-token" }),
      );

      const result = await syncImport.importAllEvents(userId, calendar, 1000);

      expect(gcalService.getAllEvents).toHaveBeenLastCalledWith(
        expect.objectContaining({ pageToken: "page-2-token" }),
      );
      expect(result.nextSyncToken).toBe("final-sync-token");

      // Page 1's event was not re-fetched/duplicated by the retry.
      expect(
        await mongoService.event.countDocuments({
          "externalReference.eventId": page1Event.id,
        }),
      ).toBe(1);
      expect(
        await mongoService.event.countDocuments({
          "externalReference.eventId": page2Event.id,
        }),
      ).toBe(1);

      const syncAfterRetry = await getSync({ userId });
      const eventSyncAfterRetry = syncAfterRetry?.google?.events?.find(
        (e) => e.gCalendarId === "primary",
      );
      expect(eventSyncAfterRetry?.nextSyncToken).toBe("final-sync-token");
    });

    it("resumes import using the stored nextPageToken", async () => {
      await updateSync(
        Resource_Sync.EVENTS,
        userId,
        calendar.source.provider === "google" ? calendar.source.calendarId : "",
        { nextPageToken: "stored-page-token" },
      );

      const gEvent = mockRegularGcalEvent();
      (gcalService.getAllEvents as jest.Mock).mockReturnValue(
        asPages({ items: [gEvent], nextSyncToken: "sync-token-1" }),
      );

      const syncImport = new SyncImport(context);
      const pageToken = await getGCalEventsSyncPageToken(
        userId,
        calendar.source.provider === "google" ? calendar.source.calendarId : "",
      );
      expect(pageToken).toBe("stored-page-token");

      await syncImport.importAllEvents(userId, calendar, 1000);

      expect(gcalService.getAllEvents).toHaveBeenCalledWith(
        expect.objectContaining({ pageToken: "stored-page-token" }),
      );
    });
  });

  describe("importLatestEvents / importEventsByCalendar", () => {
    it("imports only what changed since the calendar's last known sync token", async () => {
      await updateSync(
        Resource_Sync.EVENTS,
        userId,
        calendar.source.provider === "google" ? calendar.source.calendarId : "",
        { nextSyncToken: "existing-sync-token" },
      );

      const gEvent = mockRegularGcalEvent();
      (gcalService.getEvents as jest.Mock).mockResolvedValue({
        data: { items: [gEvent], nextSyncToken: "next-sync-token" },
      });

      const syncImport = new SyncImport(context);
      const result = await syncImport.importLatestEvents(
        userId,
        calendar,
        1000,
      );

      expect(result.totalSaved).toBe(1);
      expect(gcalService.getEvents).toHaveBeenCalledWith(
        context,
        expect.objectContaining({ syncToken: "existing-sync-token" }),
      );

      const sync = await getSync({ userId });
      const eventSync = sync?.google?.events?.find(
        (e) =>
          e.gCalendarId ===
          (calendar.source.provider === "google"
            ? calendar.source.calendarId
            : ""),
      );
      expect(eventSync?.nextSyncToken).toBe("next-sync-token");
    });

    it("returns empty stats when no sync token is known yet", async () => {
      const syncImport = new SyncImport(context);
      const result = await syncImport.importLatestEvents(
        userId,
        calendar,
        1000,
      );

      expect(result.totalSaved).toBe(0);
      expect(gcalService.getEvents).not.toHaveBeenCalled();
    });

    it("deletes the matching event when Google reports a cancellation", async () => {
      const gEvent = mockRegularGcalEvent();
      (gcalService.getEvents as jest.Mock).mockResolvedValueOnce({
        data: { items: [gEvent], nextSyncToken: "sync-token-1" },
      });

      const syncImport = new SyncImport(context);
      await syncImport.importEventsByCalendar(
        userId,
        calendar,
        "initial-token",
        1000,
      );

      (gcalService.getEvents as jest.Mock).mockResolvedValueOnce({
        data: {
          items: [{ ...gEvent, status: "cancelled" }],
          nextSyncToken: "sync-token-2",
        },
      });

      const result = await syncImport.importEventsByCalendar(
        userId,
        calendar,
        "sync-token-1",
        1000,
      );

      expect(result.totalDeleted).toBe(1);
      expect(
        await mongoService.event.countDocuments({
          "externalReference.eventId": gEvent.id,
        }),
      ).toBe(0);
    });
  });
});
