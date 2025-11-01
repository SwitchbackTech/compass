import { faker } from "@faker-js/faker";
import {
  Categories_Recurrence,
  InstanceEventMetadataSchema,
} from "@core/types/event.types";
import { isAllDay, isInstance } from "@core/util/event/event.util";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import { CalendarDriver } from "@backend/__tests__/drivers/calendar.driver";
import { getEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import { GcalEventsSyncProcessor } from "@backend/sync/services/sync/gcal.sync.processor";
import userService from "@backend/user/services/user.service";
import { EventDriver } from "../../../../__tests__/drivers/event.driver";

describe("GcalSyncProcessor UPSERT: INSTANCE", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it.each([{ type: "ALLDAY" }, { type: "TIMED" }])(
    "should handle UPDATING an %type INSTANCE",
    async ({ type }) => {
      /* Assemble */
      const newUser = await AuthDriver.googleSignup();
      const user = await AuthDriver.googleLogin(newUser._id);
      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
      const isSomeday = false;

      await userService.restartGoogleCalendarSync(user._id);

      const events = await getEventsInDb({ calendar: calendar._id, isSomeday });
      const typeFilter = type === "ALLDAY" ? isAllDay : isInstance;
      const instanceEvents = events.filter(isInstance).filter(typeFilter);
      console.log("Events:", events.filter(isInstance));
      const instanceEvent = faker.helpers.arrayElement(instanceEvents);

      expect(instanceEvent).toBeDefined();

      const gcalEvent = await EventDriver.getGCalEvent(
        user._id,
        InstanceEventMetadataSchema.parse(instanceEvent.metadata).id,
        calendar.metadata.id,
      );

      // Simulate a change to the instance in GCal
      const origTitle = gcalEvent?.summary;

      const updatedGcalEvent = {
        ...gcalEvent,
        summary: origTitle + " - Changed in GCal",
      };

      const title = updatedGcalEvent.summary;

      const changes = await GcalEventsSyncProcessor.processEvents([
        { calendar, payload: updatedGcalEvent },
      ]);

      // Verify the correct change was detected
      expect(changes).toHaveLength(1);

      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: title,
            category: Categories_Recurrence.RECURRENCE_INSTANCE,
            operation: "RECURRENCE_INSTANCE_UPDATED",
          }),
        ]),
      );

      const updatedInstance = await mongoService.event.findOne({
        "metadata.id": updatedGcalEvent.id,
        calendar: calendar._id,
      });

      // Verify the instance was updated
      expect(updatedInstance).toBeDefined();
      expect(updatedInstance?.title).toEqual(title);
    },
  );
});
