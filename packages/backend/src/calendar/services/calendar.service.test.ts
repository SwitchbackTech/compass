import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";
import { MapCalendar } from "@core/mappers/map.calendar";
import {
  CalendarProvider,
  CompassCalendarSchema,
  GoogleCalendarMetadataSchema,
} from "@core/types/calendar.types";
import { StringV4Schema } from "@core/types/type.utils";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import calendarService from "@backend/calendar/services/calendar.service";
import syncService from "@backend/sync/services/sync.service";

describe("CalendarService", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  describe("initializeGoogleCalendars", () => {
    it("initializes Google calendars to sync for a user", async () => {
      const user = await AuthDriver.googleSignup();
      const gcal = await getGcalClient(user._id);

      const result = await calendarService.initializeGoogleCalendars(
        user._id,
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
    it("creates a google calendar entry", async () => {
      const user = await AuthDriver.googleSignup();
      const gcal = await getGcalClient(user._id);
      const { calendars } = await syncService.getCalendarsToSync(gcal);

      const compassCalendar = MapCalendar.gcalToCompass(
        user._id,
        calendars[0]!,
      );

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
      const user = await AuthDriver.googleSignup();
      const userId = user._id;
      const gcal = await getGcalClient(userId);

      await calendarService.initializeGoogleCalendars(userId, gcal);

      const calendars = await calendarService.getAllByUser(userId);

      expect(calendars.length).toBeGreaterThan(1);

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
      const user = await AuthDriver.googleSignup();
      const userId = user._id;
      const gcal = await getGcalClient(userId);

      await calendarService.initializeGoogleCalendars(userId, gcal);

      const all = await calendarService.getAllByUser(userId);

      expect(all.length).toBeGreaterThan(1);

      const numSelected = faker.number.int({ min: 1, max: all.length - 1 });
      const toggledCalendars = faker.helpers.shuffle(all).slice(0, numSelected);

      await calendarService.toggleSelection(
        userId,
        toggledCalendars.map(({ _id }) => ({
          id: _id,
          selected: false,
        })),
      );

      const selected =
        await calendarService.getSelectedByUserAndProvider(userId);
      const userCalendars = await calendarService.getAllByUser(userId);

      expect(selected).toHaveLength(all.length - toggledCalendars.length);

      selected.forEach((c) => {
        expect(c.selected).toBe(true);
        expect(
          toggledCalendars.find(({ _id }) => c._id.equals(_id)),
        ).toBeUndefined();
      });

      expect(
        userCalendars
          .filter((c) =>
            ObjectId.isValid(
              toggledCalendars.find(({ _id }) => _id === c._id)?._id ?? "",
            ),
          )
          .every((c) => c.selected === false),
      ).toBe(true);
    });

    it("returns only selected calendars by provider", async () => {
      const user = await AuthDriver.googleSignup();
      const userId = user._id;
      const gcal = await getGcalClient(userId);

      await calendarService.initializeGoogleCalendars(userId, gcal);
      // Initialize other provider calendars when applicable

      const all = await calendarService.getAllByUser(userId);
      const numSelected = faker.number.int({ min: 1, max: all.length - 1 });
      const toggledCalendars = faker.helpers.shuffle(all).slice(0, numSelected);

      await calendarService.toggleSelection(
        userId,
        toggledCalendars.map(({ _id }) => ({
          id: _id,
          selected: false,
        })),
      );

      const selected =
        await calendarService.getSelectedByUserAndProvider(userId);
      const userCalendars = await calendarService.getAllByUser(userId);

      expect(selected).toHaveLength(all.length - toggledCalendars.length);

      selected.forEach((c) => {
        expect(c.selected).toBe(true);
        expect(c.metadata.provider).toBe(CalendarProvider.GOOGLE);
        expect(
          toggledCalendars.find(({ _id }) => c._id.equals(_id)),
        ).toBeUndefined();
      });

      expect(
        userCalendars
          .filter((c) =>
            ObjectId.isValid(
              toggledCalendars.find(({ _id }) => _id === c._id)?._id ?? "",
            ),
          )
          .every((c) => c.selected === false),
      ).toBe(true);
    });
  });

  describe("getPrimaryByUser", () => {
    it("returns the primary calendar", async () => {
      const user = await AuthDriver.googleSignup();
      const userId = user._id;
      const gcal = await getGcalClient(userId);

      await calendarService.initializeGoogleCalendars(userId, gcal);

      const primaryCalendar = await calendarService.getPrimaryByUser(userId);

      expect(primaryCalendar).toBeDefined();
      expect(primaryCalendar?.primary).toBe(true);
    });
  });

  describe("toggleSelection", () => {
    it("updates selection state for given calendars", async () => {
      const user = await AuthDriver.googleSignup();
      const gcal = await getGcalClient(user._id);

      await calendarService.initializeGoogleCalendars(user._id, gcal);

      const calendarList = await calendarService.getAllByUser(user._id);

      expect(calendarList.length).toBeGreaterThan(1);

      calendarList.forEach((c) => expect(c.selected).toBe(true));

      const numSelected = faker.number.int({
        min: 1,
        max: calendarList.length - 1,
      });

      const toggledCalendars = faker.helpers
        .shuffle(calendarList)
        .slice(0, numSelected);

      await calendarService.toggleSelection(
        user._id,
        toggledCalendars.map(({ _id }) => ({
          id: _id,
          selected: false,
        })),
      );

      const updatedCalendarList = await calendarService.getAllByUser(user._id);

      expect(updatedCalendarList.some(({ selected }) => !selected)).toBe(true);

      updatedCalendarList.forEach((c) => {
        const toggled = toggledCalendars.find(({ _id }) => c._id.equals(_id));

        expect(c.selected).toBe(toggled ? false : true);
      });
    });
  });

  describe("deleteAllByUser", () => {
    it("removes all calendars for user", async () => {
      const user = await AuthDriver.googleSignup();
      const gcal = await getGcalClient(user._id);
      const { calendars } = await syncService.getCalendarsToSync(gcal);

      await calendarService.initializeGoogleCalendars(user._id, gcal);

      const delResult = await calendarService.deleteAllByUser(user._id);

      expect(delResult.deletedCount).toEqual(calendars.length);
      expect(delResult.acknowledged).toBe(true);

      const remaining = await calendarService.getAllByUser(user._id);

      expect(remaining).toHaveLength(0);
    });
  });
});
