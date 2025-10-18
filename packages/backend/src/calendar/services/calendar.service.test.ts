import { faker } from "@faker-js/faker";
import { createMockCalendarListEntry } from "@core/__tests__/helpers/gcal.factory";
import { MapCalendar } from "@core/mappers/map.calendar";
import {
  CompassCalendarSchema,
  GoogleCalendarMetadataSchema,
} from "@core/types/calendar.types";
import { StringV4Schema } from "@core/types/type.utils";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import calendarService from "@backend/calendar/services/calendar.service";

describe("CalendarService", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  describe("initializeGoogleCalendars", () => {
    it("initializes Google calendars to sync for a user", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const gcal = await getGcalClient(userId);

      const result = await calendarService.initializeGoogleCalendars(
        userId,
        gcal,
      );

      expect(result).toEqual(
        expect.objectContaining({
          acknowledged: true,
          insertedCount: expect.any(Number),
          insertedIds: expect.any(Object),
          modifiedCount: result.modifiedCount,
          upsertedIds: expect.any(Object),
          deletedCount: expect.any(Number),
        }),
      );

      expect(
        result.googleCalendars.map((calendar) =>
          GoogleCalendarMetadataSchema.safeParse(calendar),
        ),
      ).toEqual(
        expect.arrayContaining([expect.objectContaining({ success: true })]),
      );

      expect(StringV4Schema.safeParse(result.nextSyncToken).success).toBe(true);
    });
  });

  describe("create", () => {
    it("creates an google calendar entry", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const googleCalEntry = createMockCalendarListEntry();
      const compassCalendar = MapCalendar.gcalToCompass(userId, googleCalEntry);

      const result = await calendarService.create(compassCalendar);

      expect(result).toEqual(
        expect.objectContaining({
          acknowledged: true,
          insertedId: compassCalendar._id,
        }),
      );
    });
  });

  describe("getByUser", () => {
    it("returns all calendars for user", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const gcal = await getGcalClient(userId);

      await calendarService.initializeGoogleCalendars(userId, gcal);

      const calendars = await calendarService.getByUser(userId);

      expect(calendars.length).toBeGreaterThan(0);

      expect(
        calendars.map((calendar) => CompassCalendarSchema.safeParse(calendar)),
      ).toEqual(
        expect.arrayContaining(
          calendars.map(() => expect.objectContaining({ success: true })),
        ),
      );
    });
  });

  describe("getSelectedByUser", () => {
    it("returns only selected calendars", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const gcal = await getGcalClient(userId);
      const googleCalEntry = createMockCalendarListEntry();
      const compassCalendar = MapCalendar.gcalToCompass(userId, googleCalEntry);

      await calendarService.create(compassCalendar);
      await calendarService.initializeGoogleCalendars(userId, gcal);

      const all = await calendarService.getByUser(userId);

      const toggledCalendars = faker.helpers
        .shuffle(all)
        .slice(0, Math.round(all.length / 2));

      await calendarService.toggleSelection(
        userId,
        toggledCalendars.map(({ _id }) => ({
          id: _id,
          selected: false,
        })),
      );

      const selected = await calendarService.getSelectedByUser(userId);

      expect(selected).toHaveLength(all.length - toggledCalendars.length);

      selected.forEach((c) => {
        expect(c.selected).toBe(true);
        expect(
          toggledCalendars.find(({ _id }) => c._id.equals(_id)),
        ).toBeDefined();
      });
    });
  });

  describe("getPrimaryByUser", () => {
    it("returns the primary calendar", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const gcal = await getGcalClient(userId);
      const googleCalEntry = createMockCalendarListEntry();
      const compassCalendar = MapCalendar.gcalToCompass(userId, googleCalEntry);

      await calendarService.create(compassCalendar);
      await calendarService.initializeGoogleCalendars(userId, gcal);

      const primaryCalendar = await calendarService.getPrimaryByUser(userId);

      expect(primaryCalendar).toBeDefined();
      expect(primaryCalendar?.primary).toBe(true);
    });
  });

  describe("toggleSelection", () => {
    it("updates selection state for given calendars", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const gcal = await getGcalClient(userId);
      const googleCalEntry = createMockCalendarListEntry();
      const compassCalendar = MapCalendar.gcalToCompass(userId, googleCalEntry);

      await calendarService.create(compassCalendar);
      await calendarService.initializeGoogleCalendars(userId, gcal);

      const calendarList = await calendarService.getByUser(userId);

      calendarList.forEach((c) => {
        expect(c.selected).toBe(true);
      });

      const toggledCalendars = faker.helpers
        .shuffle(calendarList)
        .slice(0, Math.round(calendarList.length / 2));

      await calendarService.toggleSelection(
        userId,
        toggledCalendars.map(({ _id }) => ({
          id: _id,
          selected: false,
        })),
      );

      const updatedCalendarList = await calendarService.getByUser(userId);

      expect(updatedCalendarList.some(({ selected }) => !selected)).toBe(true);

      updatedCalendarList.forEach((c) => {
        const toggled = toggledCalendars.find(({ _id }) => c._id.equals(_id));

        expect(c.selected).toBe(toggled ? false : true);
      });
    });
  });

  describe("deleteAllByUser", () => {
    it("removes all calendars for user", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const googleCalEntry = createMockCalendarListEntry();
      const compassCalendar = MapCalendar.gcalToCompass(userId, googleCalEntry);

      await calendarService.create(compassCalendar);

      const delResult = await calendarService.deleteAllByUser(userId);

      expect(delResult.deletedCount).toEqual(1);
      expect(delResult.acknowledged).toBe(true);

      const remaining = await calendarService.getByUser(userId);

      expect(remaining).toHaveLength(0);
    });
  });
});
