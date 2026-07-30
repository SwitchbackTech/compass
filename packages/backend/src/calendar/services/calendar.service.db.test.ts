import { ObjectId } from "mongodb";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import { seedGoogleCalendar } from "@backend/__tests__/helpers/event-propagation.test-helpers";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { CalendarRecordSchema } from "@backend/calendar/calendar.record";
import calendarService from "@backend/calendar/services/calendar.service";
import mongoService from "@backend/common/services/mongo.service";
import { afterAll, beforeEach, describe, expect, it } from "bun:test";

describe("CalendarService", () => {
  beforeEach(() => setupTestDb(import.meta.url));
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

  describe("list", () => {
    it("returns every calendar owned by the user", async () => {
      const { user } = await UtilDriver.setupTestUser();

      await seedGoogleCalendar(user._id);
      await seedLocalCalendar(user._id);

      const calendars = await calendarService.list(user._id.toString());

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
