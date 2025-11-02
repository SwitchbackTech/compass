import { faker } from "@faker-js/faker/.";
import {
  BaseEventSchema,
  StandaloneEventMetadataSchema,
} from "@core/types/event.types";
import { Resource_Sync } from "@core/types/sync.types";
import { StringV4Schema } from "@core/types/type.utils";
import { isBase, isInstance } from "@core/util/event/event.util";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import { CalendarDriver } from "@backend/__tests__/drivers/calendar.driver";
import { getEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { simulateGoogleCalendarEventCreation } from "@backend/__tests__/helpers/mock.events.init";
import {
  mockRecurringGcalBaseEvent,
  mockRecurringGcalInstances,
} from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { GCalNotificationHandler } from "@backend/sync/services/notify/handler/gcal.notification.handler";
import { getGCalEventsSync } from "@backend/sync/util/sync.queries";
import userService from "@backend/user/services/user.service";

describe("GCalNotificationHandler", () => {
  beforeAll(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  describe("handleNotification", () => {
    it("should process events after changes", async () => {
      // Setup
      const newUser = await AuthDriver.googleSignup();
      const user = await AuthDriver.googleLogin(newUser._id);

      await userService.restartGoogleCalendarSync(user._id);

      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
      const userId = user._id.toString();
      const gCalendarId = calendar.metadata.id;
      const resource = Resource_Sync.EVENTS;
      const gcal = await getGcalClient(user._id);
      const token = await getGCalEventsSync(userId, gCalendarId);
      const baseRecurringGcalEvent = mockRecurringGcalBaseEvent();
      const instances = mockRecurringGcalInstances(baseRecurringGcalEvent);

      //simulate event creation in Google Calendar
      await simulateGoogleCalendarEventCreation(
        gCalendarId,
        baseRecurringGcalEvent,
        gcal,
      );

      await Promise.all(
        instances.map((instance) =>
          simulateGoogleCalendarEventCreation(gCalendarId, instance, gcal),
        ),
      );

      const handler = new GCalNotificationHandler(
        gcal,
        resource,
        user._id,
        gCalendarId,
        StringV4Schema.parse(token?.nextSyncToken),
      );

      // Execute
      const result = await handler.handleNotification();

      // Verify
      const currentEventsInDb = await getEventsInDb({
        calendar: calendar._id,
        isSomeday: false,
      });

      // Verify we have the base event
      const baseEvents = currentEventsInDb.filter(isBase);

      const baseEvent = BaseEventSchema.parse(
        baseEvents.find((e) => e.metadata?.id === baseRecurringGcalEvent.id),
      );

      expect(baseEvent.title).toBe(baseRecurringGcalEvent.summary);

      // Verify we have the correct instance
      const instanceEvents = currentEventsInDb.filter(isInstance);

      const baseGEventId = StandaloneEventMetadataSchema.parse(
        baseEvent.metadata,
      ).id;

      expect(instanceEvents.map((e) => e.metadata?.id)).toEqual(
        expect.arrayContaining([expect.stringMatching(baseGEventId)]),
      );

      expect(result.summary).toEqual("PROCESSED");
    });

    it("should return IGNORED when no changes found", async () => {
      // Setup
      const newUser = await AuthDriver.googleSignup();
      const user = await AuthDriver.googleLogin(newUser._id);
      await userService.restartGoogleCalendarSync(user._id);

      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
      const userId = user._id.toString();
      const gCalendarId = calendar.metadata.id;
      const resource = Resource_Sync.EVENTS;
      const gcal = await getGcalClient(user._id);
      const token = await getGCalEventsSync(userId, gCalendarId);
      const handler = new GCalNotificationHandler(
        gcal,
        resource,
        user._id,
        gCalendarId,
        StringV4Schema.parse(token?.nextSyncToken),
      );

      const result = await handler.handleNotification();

      expect(result.summary).toEqual("IGNORED");
      expect(result.changes).toEqual([]);
    });

    it("should return IGNORED if resource is not EVENTS", async () => {
      const newUser = await AuthDriver.googleSignup();
      const user = await AuthDriver.googleLogin(newUser._id);

      await userService.restartGoogleCalendarSync(user._id);

      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
      const userId = user._id.toString();
      const gCalendarId = calendar.metadata.id;
      const resource = Resource_Sync.CALENDAR;
      const gcal = await getGcalClient(user._id);

      const token = await getGCalEventsSync(userId, Resource_Sync.CALENDAR);

      const handler = new GCalNotificationHandler(
        gcal,
        resource,
        user._id,
        gCalendarId,
        StringV4Schema.parse(token?.nextSyncToken ?? faker.string.uuid()),
      );

      const result = await handler.handleNotification();

      expect(result.summary).toBe("IGNORED");
      expect(result.changes).toEqual([]);
    });

    it("should return IGNORED if no changes and nextSyncToken is different", async () => {
      const newUser = await AuthDriver.googleSignup();
      const user = await AuthDriver.googleLogin(newUser._id);

      await userService.restartGoogleCalendarSync(user._id);

      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
      const gCalendarId = calendar.metadata.id;
      const resource = Resource_Sync.CALENDAR;
      const gcal = await getGcalClient(user._id);

      const handler = new GCalNotificationHandler(
        gcal,
        resource,
        user._id,
        gCalendarId,
        faker.string.uuid(),
      );

      const result = await handler.handleNotification();

      expect(result.summary).toBe("IGNORED");
      expect(result.changes).toEqual([]);
    });
  });
});
