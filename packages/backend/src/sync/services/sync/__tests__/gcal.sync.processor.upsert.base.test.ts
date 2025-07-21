import { Categories_Recurrence } from "@core/types/event.types";
import { categorizeEvents } from "@core/util/event/event.util";
import { getEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestMongo,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { simulateDbAfterGcalImport } from "@backend/__tests__/helpers/mock.events.init";
import { mockRecurringGcalBaseEvent } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { RecurringEventRepository } from "@backend/event/services/recur/repo/recur.event.repo";
import { UtilDriver } from "../../../../__tests__/drivers/util.driver";
import { GcalSyncProcessor } from "../gcal.sync.processor";
import {
  datesAreInUtcOffset,
  eventsMatchSchema,
  getLatestEventsFromDb,
  hasNewUpdatedAtTimestamp,
  instanceDataMatchCompassBase,
  instanceDataMatchesGcalBase,
} from "./gcal.sync.processor.test.util";

describe("GcalSyncProcessor UPSERT: BASE", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestMongo);

  it("should handle CREATING a TIMED SERIES from a BASE", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const repo = new RecurringEventRepository(user._id.toString());

    await simulateDbAfterGcalImport(user._id.toString());

    const newBase = mockRecurringGcalBaseEvent();

    const processor = new GcalSyncProcessor(repo);
    const changes = await processor.processEvents([newBase]);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({
      title: newBase.summary,
      category: Categories_Recurrence.RECURRENCE_BASE,
      operation: "UPSERTED",
    });
    const updatedEvents = await getEventsInDb({ user: user._id.toString() });
    eventsMatchSchema(updatedEvents);
  });

  it("should handle UPDATING an ALL-DAY SERIES", async () => {
    /* Assemble */
    const { user } = await UtilDriver.setupTestUser();
    const repo = new RecurringEventRepository(user._id.toString());
    const { gcalEvents } = await simulateDbAfterGcalImport(user._id.toString());

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
      start: {
        date: "2025-04-21",
        timeZone: "America/Chicago",
      },
      end: {
        date: "2025-04-23",
        timeZone: "America/Chicago",
      },
    };

    const processor = new GcalSyncProcessor(repo);
    const changes = await processor.processEvents([updatedGcalAllDayBase]);

    /* Assert */
    // Validate the correct change was detected
    expect(changes).toHaveLength(1);
    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: updatedGcalAllDayBase.summary,
          category: Categories_Recurrence.RECURRENCE_BASE, // TODO change to series for clarity?
          operation: "UPSERTED",
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
    const repo = new RecurringEventRepository(user._id.toString());

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
      start: {
        dateTime: "2025-04-21T19:15:00-05:00",
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: "2025-04-21T20:30:00-05:00",
        timeZone: "America/Chicago",
      },
    };

    const processor = new GcalSyncProcessor(repo);
    const changes = await processor.processEvents([updatedGcalBase]);

    /* Assert */
    // Validate the correct change was detected
    expect(changes).toHaveLength(1);
    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: updatedGcalBase.summary,
          category: Categories_Recurrence.RECURRENCE_BASE, // TODO change to series for clarity?
          operation: "UPSERTED",
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
