import { ObjectId } from "mongodb";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { CalendarRecordSchema } from "@backend/calendar/calendar.record";
import calendarService from "@backend/calendar/services/calendar.service";
import { createGoogleRequestContext } from "@backend/common/services/gcal/gcal.context";
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
});
