import { ObjectId } from "bson";
import { faker } from "@faker-js/faker/.";
import {
  Categories_Recurrence,
  StandaloneEventMetadataSchema,
  TransitionCategoriesRecurrence,
} from "@core/types/event.types";
import { isRegular } from "@core/util/event/event.util";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import { CalendarDriver } from "@backend/__tests__/drivers/calendar.driver";
import { EventDriver } from "@backend/__tests__/drivers/event.driver";
import { getEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { mockRegularGcalEvent } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { GcalEventsSyncProcessor } from "@backend/sync/services/sync/gcal.sync.processor";
import userService from "@backend/user/services/user.service";

describe("GcalSyncProcessor UPSERT: REGULAR", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should handle CREATING a new REGULAR event", async () => {
    /* Assemble */
    const user = await AuthDriver.googleSignup();
    const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

    const userEventsInDb = await getEventsInDb({
      calendar: calendar._id,
      isSomeday: false,
    });

    const origEventsCount = userEventsInDb.length;

    /* Act */
    const newStandalone = mockRegularGcalEvent({
      summary: "New Standalone Event",
    });

    const changes = await GcalEventsSyncProcessor.processEvents([
      { calendar, payload: newStandalone },
    ]);

    /* Assert */
    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual(
      expect.objectContaining({
        calendar: calendar._id,
        user: user._id,
        id: expect.any(ObjectId),
        title: newStandalone.summary,
        category: Categories_Recurrence.REGULAR,
        operation: "REGULAR_CREATED",
        transition: [null, TransitionCategoriesRecurrence.REGULAR_CONFIRMED],
      }),
    );

    // Verify that a new event was added
    const updatedEvents = await getEventsInDb({
      calendar: calendar._id,
      isSomeday: false,
    });

    expect(updatedEvents).toHaveLength(origEventsCount + 1);

    // Verify the the new event has the right data
    const updatedEvent = updatedEvents.find(
      (e) => e.metadata?.id === newStandalone.id,
    );

    expect(updatedEvent).toBeDefined();

    expect(updatedEvent?.title).toEqual(newStandalone.summary);
  });

  it("should handle UPDATING an existing REGULAR event", async () => {
    /* Assemble */
    const newUser = await AuthDriver.googleSignup();
    const user = await AuthDriver.googleLogin(newUser._id);

    await userService.restartGoogleCalendarSync(user._id);

    const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
    const isSomeday = false;
    const events = await getEventsInDb({ calendar: calendar._id, isSomeday });
    const regularEvents = events.filter(isRegular);
    const regularEvent = faker.helpers.arrayElement(regularEvents);

    expect(regularEvent).toBeDefined();

    const origEventsCount = events.length;
    const gcalEvent = await EventDriver.getGCalEvent(
      user._id,
      StandaloneEventMetadataSchema.parse(regularEvent.metadata).id,
      calendar.metadata.id,
    );

    // Simulate a change to the standalone event in GCal
    const updatedRegular = {
      ...gcalEvent,
      summary: gcalEvent.summary + " - Changed in GCal",
    };

    /* Act */
    const changes = await GcalEventsSyncProcessor.processEvents([
      { calendar, payload: updatedRegular },
    ]);

    /* Assert */
    // Verify the correct change was detected
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      calendar: calendar._id,
      user: user._id,
      id: expect.any(ObjectId),
      title: updatedRegular.summary,
      category: Categories_Recurrence.REGULAR,
      operation: "REGULAR_UPDATED",
    });

    const updatedEvents = await getEventsInDb({
      calendar: calendar._id,
      isSomeday,
    });

    // Verify no other events were deleted/added
    expect(updatedEvents).toHaveLength(origEventsCount);

    // Verify the event was updated
    const updatedEvent = updatedEvents.find(
      (e) => e.metadata?.id === updatedRegular.id,
    );

    expect(updatedEvent?.title).toEqual(updatedRegular.summary);
  });
});
