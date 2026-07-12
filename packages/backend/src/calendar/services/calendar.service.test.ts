import { ObjectId } from "mongodb";
import { type CalendarAccess } from "@core/types/calendar.contracts";
import { AvailabilityQuerySchema } from "@core/types/event-command.contracts";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { CalendarRecordSchema } from "@backend/calendar/calendar.record";
import calendarService from "@backend/calendar/services/calendar.service";
import { createGoogleRequestContext } from "@backend/common/services/gcal/gcal.context";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";

describe("CalendarService", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  const seedLocalCalendar = async (userId: ObjectId) => {
    const record = CalendarRecordSchema.parse({
      _id: new ObjectId(),
      userId,
      name: "Compass",
      description: "",
      timeZone: null,
      foregroundColor: "#000000",
      backgroundColor: "#ffffff",
      access: "owner",
      isPrimary: false,
      isVisible: true,
      isActive: true,
      source: { provider: "local" },
      createdAt: new Date(),
      updatedAt: null,
    });
    await mongoService.calendar.insertOne(record);
    return record;
  };

  const seedGoogleCalendar = async (
    userId: ObjectId,
    overrides: {
      access?: CalendarAccess;
      googleCalendarId?: string;
      isActive?: boolean;
      isVisible?: boolean;
    } = {},
  ) => {
    const {
      access = "freeBusyReader",
      googleCalendarId = `google-cal-${new ObjectId().toHexString()}`,
      isActive = true,
      isVisible = true,
    } = overrides;
    const record = CalendarRecordSchema.parse({
      _id: new ObjectId(),
      userId,
      name: "Shared calendar",
      description: "",
      timeZone: null,
      foregroundColor: "#000000",
      backgroundColor: "#ffffff",
      access,
      isPrimary: false,
      isVisible,
      isActive,
      source: {
        provider: "google",
        calendarId: googleCalendarId,
        etag: "etag-1",
      },
      createdAt: new Date(),
      updatedAt: null,
    });
    await mongoService.calendar.insertOne(record);
    return record;
  };

  describe("initializeGoogleCalendars", () => {
    it("upserts the user's Google calendars as CalendarRecords", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const context = await createGoogleRequestContext(userId);

      const result = await calendarService.initializeGoogleCalendars(
        userId,
        context,
      );

      expect(result.acknowledged).toBe(true);

      const records = await mongoService.calendar
        .find({ userId: user._id, "source.provider": "google" })
        .toArray();

      expect(records.length).toBeGreaterThan(0);
      records.forEach((record) => {
        expect(CalendarRecordSchema.safeParse(record).success).toBe(true);
      });
    });

    it("is idempotent: re-running preserves the record id and user-set visibility", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const context = await createGoogleRequestContext(userId);

      await calendarService.initializeGoogleCalendars(userId, context);
      const [before] = await mongoService.calendar
        .find({ userId: user._id, "source.provider": "google" })
        .toArray();

      await calendarService.setVisibility(userId, [
        { calendarId: before!._id.toHexString(), isVisible: false },
      ]);

      await calendarService.initializeGoogleCalendars(userId, context);
      const [after] = await mongoService.calendar
        .find({ userId: user._id, "source.provider": "google" })
        .toArray();

      expect(after!._id).toEqual(before!._id);
      expect(after!.isVisible).toBe(false);
    });
  });

  describe("list", () => {
    it("returns every calendar owned by the user", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const context = await createGoogleRequestContext(userId);

      await calendarService.initializeGoogleCalendars(userId, context);
      await seedLocalCalendar(user._id);

      const calendars = await calendarService.list(userId);

      expect(calendars.length).toBeGreaterThanOrEqual(2);
      calendars.forEach((record) => {
        expect(CalendarRecordSchema.safeParse(record).success).toBe(true);
      });
    });
  });

  describe("setVisibility", () => {
    it("bulk-updates isVisible for the given calendars", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const local = await seedLocalCalendar(user._id);

      const ok = await calendarService.setVisibility(user._id.toString(), [
        { calendarId: local._id.toHexString(), isVisible: false },
      ]);

      expect(ok).toBe(true);

      const updated = await mongoService.calendar.findOne({ _id: local._id });
      expect(updated?.isVisible).toBe(false);
    });
  });

  describe("getLocalCalendar", () => {
    it("returns the user's local calendar", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const local = await seedLocalCalendar(user._id);

      const found = await calendarService.getLocalCalendar(user._id.toString());

      expect(found?._id).toEqual(local._id);
    });
  });

  describe("getPrimaryGoogleCalendar", () => {
    it("returns the active primary Google calendar", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const context = await createGoogleRequestContext(userId);

      await calendarService.initializeGoogleCalendars(userId, context);

      const primary = await calendarService.getPrimaryGoogleCalendar(userId);

      expect(primary?.isPrimary).toBe(true);
      expect(primary?.source.provider).toBe("google");
    });
  });

  describe("getOwnedActiveCalendar", () => {
    it("returns a calendar the user owns", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const local = await seedLocalCalendar(user._id);

      const found = await calendarService.getOwnedActiveCalendar(
        user._id.toString(),
        local._id.toString(),
      );

      expect(found?._id).toEqual(local._id);
    });

    it("returns null for a calendar owned by another user", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const { user: otherUser } = await UtilDriver.setupTestUser();
      const local = await seedLocalCalendar(otherUser._id);

      const found = await calendarService.getOwnedActiveCalendar(
        user._id.toString(),
        local._id.toString(),
      );

      expect(found).toBeNull();
    });
  });

  describe("deleteAllByUser", () => {
    it("removes every calendar for the user", async () => {
      const { user } = await UtilDriver.setupTestUser();
      await seedLocalCalendar(user._id);

      const result = await calendarService.deleteAllByUser(user._id);

      expect(result.deletedCount).toBeGreaterThan(0);
      const remaining = await calendarService.list(user._id.toString());
      expect(remaining).toHaveLength(0);
    });
  });

  describe("getAvailability", () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("merges busy periods from multiple freeBusyReader calendars, mapped back to compass ids", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const calendarA = await seedGoogleCalendar(user._id, {
        googleCalendarId: "google-a",
      });
      const calendarB = await seedGoogleCalendar(user._id, {
        googleCalendarId: "google-b",
      });
      jest.spyOn(gcalService, "queryFreeBusy").mockResolvedValue({
        calendars: {
          "google-a": {
            busy: [
              {
                start: "2024-01-15T09:00:00.000Z",
                end: "2024-01-15T10:00:00.000Z",
              },
            ],
          },
          "google-b": {
            busy: [
              {
                start: "2024-01-15T11:00:00.000Z",
                end: "2024-01-15T12:00:00.000Z",
              },
            ],
          },
        },
      });

      const query = AvailabilityQuerySchema.parse({
        calendarIds: [calendarA._id.toHexString(), calendarB._id.toHexString()],
        start: "2024-01-15T00:00:00.000Z",
        end: "2024-01-16T00:00:00.000Z",
      });

      const response = await calendarService.getAvailability(
        user._id.toString(),
        query,
      );

      expect(response.busyPeriods).toHaveLength(2);
      expect(response.busyPeriods).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            calendarId: calendarA._id.toHexString(),
            start: "2024-01-15T09:00:00.000Z",
            end: "2024-01-15T10:00:00.000Z",
          }),
          expect.objectContaining({
            calendarId: calendarB._id.toHexString(),
            start: "2024-01-15T11:00:00.000Z",
            end: "2024-01-15T12:00:00.000Z",
          }),
        ]),
      );
    });

    it("rejects a writer calendar's id (busy time must come from its synced events, not freebusy)", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const writerCalendar = await seedGoogleCalendar(user._id, {
        access: "writer",
      });
      const queryFreeBusySpy = jest.spyOn(gcalService, "queryFreeBusy");

      const query = AvailabilityQuerySchema.parse({
        calendarIds: [writerCalendar._id.toHexString()],
        start: "2024-01-15T00:00:00.000Z",
        end: "2024-01-16T00:00:00.000Z",
      });

      await expect(
        calendarService.getAvailability(user._id.toString(), query),
      ).rejects.toThrow();
      expect(queryFreeBusySpy).not.toHaveBeenCalled();
    });

    it("rejects an id for a calendar the user does not own", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const { user: otherUser } = await UtilDriver.setupTestUser();
      const othersCalendar = await seedGoogleCalendar(otherUser._id);

      const query = AvailabilityQuerySchema.parse({
        calendarIds: [othersCalendar._id.toHexString()],
        start: "2024-01-15T00:00:00.000Z",
        end: "2024-01-16T00:00:00.000Z",
      });

      await expect(
        calendarService.getAvailability(user._id.toString(), query),
      ).rejects.toThrow();
    });

    it("filters a hidden freeBusyReader calendar out of the request instead of rejecting it", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const visibleCalendar = await seedGoogleCalendar(user._id, {
        googleCalendarId: "google-visible",
      });
      const hiddenCalendar = await seedGoogleCalendar(user._id, {
        googleCalendarId: "google-hidden",
        isVisible: false,
      });
      const queryFreeBusySpy = jest
        .spyOn(gcalService, "queryFreeBusy")
        .mockResolvedValue({
          calendars: {
            "google-visible": {
              busy: [
                {
                  start: "2024-01-15T09:00:00.000Z",
                  end: "2024-01-15T10:00:00.000Z",
                },
              ],
            },
          },
        });

      const query = AvailabilityQuerySchema.parse({
        calendarIds: [
          visibleCalendar._id.toHexString(),
          hiddenCalendar._id.toHexString(),
        ],
        start: "2024-01-15T00:00:00.000Z",
        end: "2024-01-16T00:00:00.000Z",
      });

      const response = await calendarService.getAvailability(
        user._id.toString(),
        query,
      );

      expect(response.busyPeriods).toEqual([
        expect.objectContaining({
          calendarId: visibleCalendar._id.toHexString(),
        }),
      ]);
      expect(queryFreeBusySpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ gCalendarIds: ["google-visible"] }),
      );
    });

    it("treats a per-calendar Google freebusy error as an empty busy list for that calendar", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const okCalendar = await seedGoogleCalendar(user._id, {
        googleCalendarId: "google-ok",
      });
      const erroringCalendar = await seedGoogleCalendar(user._id, {
        googleCalendarId: "google-erroring",
      });
      jest.spyOn(gcalService, "queryFreeBusy").mockResolvedValue({
        calendars: {
          "google-ok": {
            busy: [
              {
                start: "2024-01-15T09:00:00.000Z",
                end: "2024-01-15T10:00:00.000Z",
              },
            ],
          },
          "google-erroring": {
            errors: [{ domain: "calendar", reason: "notFound" }],
          },
        },
      });

      const query = AvailabilityQuerySchema.parse({
        calendarIds: [
          okCalendar._id.toHexString(),
          erroringCalendar._id.toHexString(),
        ],
        start: "2024-01-15T00:00:00.000Z",
        end: "2024-01-16T00:00:00.000Z",
      });

      const response = await calendarService.getAvailability(
        user._id.toString(),
        query,
      );

      expect(response.busyPeriods).toEqual([
        expect.objectContaining({ calendarId: okCalendar._id.toHexString() }),
      ]);
    });
  });
});
