import {
  filterBaseEvents,
  filterExistingInstances,
} from "@core/util/event/event.util";
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
import { createSyncImport } from "@backend/sync/services/import/sync.import";

describe("SyncImport: Series", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should import a series when provided a gcal base event", async () => {
    /* Assemble */
    const newUser = await AuthDriver.googleSignup();
    const user = await AuthDriver.googleLogin(newUser._id);
    const syncImport = await createSyncImport(user._id);
    const gcal = await getGcalClient(user._id);
    const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
    const gCalendarId = calendar.metadata.id;

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

    /* Act */
    // trigger a series import with base event
    await syncImport.importSeries(calendar, baseRecurringGcalEvent);

    /* Assert */
    // validate DB state
    const currentEventsInDb = await getEventsInDb({
      calendar: calendar._id,
      isSomeday: false,
    });

    const baseEvents = filterBaseEvents(currentEventsInDb);

    expect(
      baseEvents.find((e) => e.metadata?.id === baseRecurringGcalEvent.id),
    ).toBeDefined();

    const instancesInDb = filterExistingInstances(currentEventsInDb);

    // validate ids
    expect(
      instances.every((i) =>
        instancesInDb.find((inDb) => inDb.metadata?.id === i.id),
      ),
    ).toBe(true);
  });
});
