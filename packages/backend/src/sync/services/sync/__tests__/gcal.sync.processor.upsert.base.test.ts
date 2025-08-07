import { Categories_Recurrence } from "@core/types/event.types";
import { categorizeEvents } from "@core/util/event/event.util";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import { getEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import {
  simulateDbAfterGcalImport,
  simulateGoogleCalendarEventCreation,
} from "@backend/__tests__/helpers/mock.events.init";
import { mockRecurringGcalBaseEvent } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import {
  datesAreInUtcOffset,
  eventsMatchSchema,
  getLatestEventsFromDb,
  hasNewUpdatedAtTimestamp,
  instanceDataMatchCompassBase,
  instanceDataMatchesGcalBase,
} from "@backend/sync/services/sync/__tests__/gcal.sync.processor.test.util";
import { GcalSyncProcessor } from "@backend/sync/services/sync/gcal.sync.processor";
import { gSchema$EventBase } from "../../../../../../core/src/types/gcal";
import dayjs from "../../../../../../core/src/util/date/dayjs";

describe("GcalSyncProcessor UPSERT: BASE", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should handle CREATING a TIMED SERIES from a BASE", async () => {
    const { user } = await UtilDriver.setupTestUser();

    await simulateDbAfterGcalImport(user._id.toString());

    const newBase = mockRecurringGcalBaseEvent();

    await simulateGoogleCalendarEventCreation(newBase);

    const processor = new GcalSyncProcessor(user._id.toString());
    const changes = await processor.processEvents([newBase]);

    expect(changes).toHaveLength(1);

    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: newBase.summary,
          category: Categories_Recurrence.RECURRENCE_BASE,
          operation: "SERIES_CREATED",
        }),
      ]),
    );

    const updatedEvents = await getEventsInDb({ user: user._id.toString() });
    eventsMatchSchema(updatedEvents);
  });

  it("should handle CREATING an ALLDAY SERIES from a BASE", async () => {
    const { user } = await UtilDriver.setupTestUser();

    await simulateDbAfterGcalImport(user._id.toString());

    const newBase: gSchema$EventBase = mockRecurringGcalBaseEvent();

    const allDayBase: gSchema$EventBase = {
      ...newBase,
      start: { date: dayjs(newBase.start?.dateTime).toYearMonthDayString() },
      end: { date: dayjs(newBase.end?.dateTime).toYearMonthDayString() },
    };

    await simulateGoogleCalendarEventCreation(allDayBase);

    const processor = new GcalSyncProcessor(user._id.toString());
    const changes = await processor.processEvents([allDayBase]);

    expect(changes).toHaveLength(1);

    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: newBase.summary,
          category: Categories_Recurrence.RECURRENCE_BASE,
          operation: "SERIES_CREATED",
        }),
      ]),
    );

    const updatedEvents = await getEventsInDb({ user: user._id.toString() });
    eventsMatchSchema(updatedEvents);
  });

  it("should handle UPDATING an ALL-DAY SERIES", async () => {
    /* Assemble */
    const { user } = await UtilDriver.setupTestUser();

    const { gcalEvents } = await simulateDbAfterGcalImport(
      user._id.toString(),
      true,
    );

    const origEvents = await getEventsInDb({ user: user._id.toString() }).then(
      (events) =>
        events.map((event) => ({ ...event, _id: event._id?.toString() })),
    );

    const { instances: origInstances } = categorizeEvents(origEvents);

    /* Act */
    const updatedGcalAllDayBase = {
      ...gcalEvents.recurring,
      summary: `${gcalEvents.recurring.summary} - UPDATED IN GCAL`,
      description: "ALL-DAY Description adjusted in Gcal",
    };

    const processor = new GcalSyncProcessor(user._id.toString());
    const changes = await processor.processEvents([updatedGcalAllDayBase]);

    /* Assert */
    // Validate the correct change was detected
    expect(changes).toHaveLength(2);
    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: updatedGcalAllDayBase.summary,
          category: Categories_Recurrence.RECURRENCE_BASE,
          operation: "RECURRENCE_BASE_UPDATED",
        }),
        expect.objectContaining({
          title: updatedGcalAllDayBase.summary,
          category: Categories_Recurrence.RECURRENCE_BASE,
          operation: "ALLDAY_INSTANCES_UPDATED",
        }),
      ]),
    );

    // Validate that all events in the series (base and instances) were updated
    const { base, instances } = await getLatestEventsFromDb({
      user: user._id.toString(),
    });

    expect(instances.length).toBeGreaterThan(0);
    for (const i of instances) {
      instanceDataMatchesGcalBase(i, updatedGcalAllDayBase);
      instanceDataMatchCompassBase(i, base);
      hasNewUpdatedAtTimestamp(i, origInstances);
    }
  });

  it("should handle UPDATING a TIMED SERIES", async () => {
    /* Assemble */
    const { user } = await UtilDriver.setupTestUser();

    const { gcalEvents } = await simulateDbAfterGcalImport(user._id.toString());

    const origEvents = await getEventsInDb({ user: user._id.toString() }).then(
      (events) =>
        events.map((event) => ({ ...event, _id: event._id?.toString() })),
    );

    const { instances: origInstances } = categorizeEvents(origEvents);

    /* Act */
    const updatedGcalBase = {
      ...gcalEvents.recurring,
      summary: gcalEvents.recurring.summary + " - UPDATED IN GCAL",
      description: "Description adjusted in Gcal",
    };

    const processor = new GcalSyncProcessor(user._id.toString());
    const changes = await processor.processEvents([updatedGcalBase]);

    /* Assert */
    // Validate the correct change was detected
    expect(changes).toHaveLength(2);
    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: updatedGcalBase.summary,
          category: Categories_Recurrence.RECURRENCE_BASE,
          operation: "RECURRENCE_BASE_UPDATED",
        }),
        expect.objectContaining({
          title: updatedGcalBase.summary,
          category: Categories_Recurrence.RECURRENCE_BASE,
          operation: "TIMED_INSTANCES_UPDATED",
        }),
      ]),
    );

    // Validate that all events in the series (base and instances) were updated
    const { base, instances } = await getLatestEventsFromDb({
      user: user._id.toString(),
    });

    expect(instances.length).toBeGreaterThan(0);
    for (const i of instances) {
      instanceDataMatchesGcalBase(i, updatedGcalBase);
      instanceDataMatchCompassBase(i, base);
      hasNewUpdatedAtTimestamp(i, origInstances);
      datesAreInUtcOffset(i);
    }
  });
});
