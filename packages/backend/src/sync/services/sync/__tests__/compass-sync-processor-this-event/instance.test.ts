import { faker } from "@faker-js/faker";
import { Priorities } from "@core/constants/core.constants";
import { CalendarProvider, Schema_Calendar } from "@core/types/calendar.types";
import {
  Categories_Recurrence,
  EditableEventFields,
  EventStatus,
  InstanceEventMetadataSchema,
  InstanceEventSchema,
  RecurringEventUpdateScope,
  Schema_Instance_Event,
  StandaloneEventMetadataSchema,
  TransitionCategoriesRecurrence,
} from "@core/types/event.types";
import { eventDatesToGcalDates } from "@core/util/event/gcal.event.util";
import { createMockBaseEvent } from "@core/util/test/ccal.event.factory";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import { CalendarDriver } from "@backend/__tests__/drivers/calendar.driver";
import { EventDriver } from "@backend/__tests__/drivers/event.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import {
  testCompassEventInGcal,
  testCompassInstanceEvent,
  testCompassSeries,
  testCompassSeriesInGcal,
} from "@backend/event/classes/compass.event.parser.test.util";
import eventService from "@backend/event/services/event.service";
import { baseEventExclusionFilterExpr } from "@backend/event/services/event.service.util";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";

describe(`CompassSyncProcessor - ${RecurringEventUpdateScope.THIS_EVENT} - Instance Event: `, () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  async function validateBaseEvent(
    calendar: Schema_Calendar,
    overrides: Parameters<typeof createMockBaseEvent>[0] = {},
  ) {
    const createBaseEventPayload = createMockBaseEvent({
      calendar: calendar._id,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] },
      ...overrides,
    });

    const changes = await CompassSyncProcessor.processEvents([
      {
        payload: createBaseEventPayload,
        calendar,
        providerSync: true,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
        status: EventStatus.CONFIRMED,
      },
    ]);

    expect(changes).toEqual(
      expect.arrayContaining([
        {
          calendar: calendar._id,
          user: calendar.user,
          id: createBaseEventPayload._id,
          title: createBaseEventPayload.title,
          transition: [
            null,
            TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
          ],
          category: Categories_Recurrence.RECURRENCE_BASE,
          operation: "SERIES_CREATED",
        },
      ]),
    );

    const events = await testCompassSeries(createBaseEventPayload, 10);
    const { baseEvent, instances } = events;

    switch (calendar.metadata.provider) {
      case CalendarProvider.GOOGLE:
        await testCompassSeriesInGcal(baseEvent, instances);
        break;
    }

    return events;
  }

  async function preValidateInstanceEventUpdate(
    instance: Schema_Instance_Event,
    calendar: Schema_Calendar,
    update: EditableEventFields,
  ) {
    expect(InstanceEventSchema.parse(instance)).toBeDefined();

    const payload = { ...instance, ...update };

    const updateChanges = await CompassSyncProcessor.processEvents([
      {
        payload,
        calendar,
        providerSync: true,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
        status: EventStatus.CONFIRMED,
      },
    ]);

    expect(updateChanges).toEqual(
      expect.arrayContaining([
        {
          calendar: calendar._id,
          user: calendar.user,
          id: payload._id,
          title: payload.title,
          transition: [
            "RECURRENCE_INSTANCE",
            TransitionCategoriesRecurrence.RECURRENCE_INSTANCE_CONFIRMED,
          ],
          category: Categories_Recurrence.RECURRENCE_INSTANCE,
          operation: "RECURRENCE_INSTANCE_UPDATED",
        },
      ]),
    );

    // check that event was updated in db
    const { instanceEvent } = await testCompassInstanceEvent(payload);

    const updatedInstance = InstanceEventSchema.parse(instanceEvent);

    // check that other instances were not updated
    const otherInstances = await mongoService.event
      .find({
        calendar: calendar._id,
        "recurrence.eventId": updatedInstance.recurrence.eventId,
        $expr: baseEventExclusionFilterExpr,
        _id: { $ne: updatedInstance._id },
      })
      .toArray();

    expect(otherInstances).toHaveLength(9);

    return { otherInstances, updatedInstance };
  }

  describe("Update - Instance Event: ", () => {
    describe("Calendar: ", () => {
      describe("Basic Edits: ", () => {
        it("should update the title field of an event", async () => {
          const user = await AuthDriver.googleSignup();
          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
          const { baseEvent: base, instances } =
            await validateBaseEvent(calendar);

          const instanceUpdate = faker.helpers.arrayElement(instances);

          const { otherInstances, updatedInstance } =
            await preValidateInstanceEventUpdate(instanceUpdate, calendar, {
              title: faker.lorem.words(3),
            });

          // check that other instances were not updated
          await Promise.all(
            otherInstances.map((instance) =>
              testCompassInstanceEvent(
                InstanceEventSchema.parse({
                  ...instance,
                  title: base.title,
                }),
              ),
            ),
          );

          // check that the base event was not updated
          const baseEvent = await eventService.readById(calendar._id, base._id);

          expect(baseEvent).toEqual(
            expect.objectContaining({ title: base.title }),
          );

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              // check that the event was updated in gcal
              await testCompassEventInGcal(updatedInstance);

              // check that the base event has not been updated in gcal
              await expect(
                EventDriver.getGCalEvent(
                  user._id,
                  StandaloneEventMetadataSchema.parse(baseEvent.metadata).id,
                  calendar.metadata.id,
                ),
              ).resolves.toEqual(
                expect.objectContaining({
                  id: base.metadata?.id,
                  summary: base.title,
                }),
              );

              // check that other instances were not updated in gcal
              await Promise.all(
                otherInstances.map((instance) =>
                  expect(
                    EventDriver.getGCalEvent(
                      user._id,
                      InstanceEventMetadataSchema.parse(instance.metadata).id,
                      calendar.metadata.id,
                    ),
                  ).resolves.toEqual(
                    expect.objectContaining({
                      id: instance.metadata?.id,
                      summary: base.title,
                    }),
                  ),
                ),
              );
              break;
            }
          }
        });

        it("should update the description field of an event", async () => {
          const user = await AuthDriver.googleSignup();
          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
          const { baseEvent: base, instances } =
            await validateBaseEvent(calendar);

          const instanceUpdate = faker.helpers.arrayElement(instances);

          const { otherInstances, updatedInstance } =
            await preValidateInstanceEventUpdate(instanceUpdate, calendar, {
              description: faker.lorem.sentence(3),
            });

          // check that other instances were not updated
          await Promise.all(
            otherInstances.map((instance) =>
              testCompassInstanceEvent(
                InstanceEventSchema.parse({
                  ...instance,
                  description: base.description,
                }),
              ),
            ),
          );

          // check that the base event was not updated
          const baseEvent = await eventService.readById(calendar._id, base._id);

          expect(baseEvent).toEqual(
            expect.objectContaining({ description: baseEvent!.description }),
          );

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              // check that the event was updated in gcal
              await testCompassEventInGcal(updatedInstance);

              // check that the base event has not been updated in gcal
              await expect(
                EventDriver.getGCalEvent(
                  user._id,
                  StandaloneEventMetadataSchema.parse(baseEvent.metadata).id,
                  calendar.metadata.id,
                ),
              ).resolves.toEqual(
                expect.objectContaining({
                  id: base.metadata?.id,
                  description: base.description,
                }),
              );

              // check that other instances were not updated in gcal
              await Promise.all(
                otherInstances.map((instance) =>
                  expect(
                    EventDriver.getGCalEvent(
                      user._id,
                      InstanceEventMetadataSchema.parse(instance.metadata).id,
                      calendar.metadata.id,
                    ),
                  ).resolves.toEqual(
                    expect.objectContaining({
                      id: instance.metadata?.id,
                      description: base.description,
                    }),
                  ),
                ),
              );
              break;
            }
          }
        });

        it("should update the priority field of an event", async () => {
          const user = await AuthDriver.googleSignup();
          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
          const { baseEvent: base, instances } = await validateBaseEvent(
            calendar,
            { priority: Priorities.WORK },
          );

          const instanceUpdate = faker.helpers.arrayElement(instances);

          const { otherInstances, updatedInstance } =
            await preValidateInstanceEventUpdate(instanceUpdate, calendar, {
              priority: Priorities.RELATIONS,
            });

          // check that other instances were not updated
          await Promise.all(
            otherInstances.map((instance) =>
              testCompassInstanceEvent(
                InstanceEventSchema.parse({
                  ...instance,
                  priority: base.priority,
                }),
              ),
            ),
          );

          // check that the base event was not updated
          const baseEvent = await eventService.readById(calendar._id, base._id);

          expect(baseEvent).toEqual(
            expect.objectContaining({ priority: base.priority }),
          );

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              // check that the event was updated in gcal
              await testCompassEventInGcal(updatedInstance);

              // check that the base event has not been updated in gcal
              await expect(
                EventDriver.getGCalEvent(
                  user._id,
                  StandaloneEventMetadataSchema.parse(baseEvent.metadata).id,
                  calendar.metadata.id,
                ),
              ).resolves.toEqual(
                expect.objectContaining({
                  id: base.metadata?.id,
                  extendedProperties: expect.objectContaining({
                    private: expect.objectContaining({
                      priority: base.priority,
                    }),
                  }),
                }),
              );

              // check that other instances were not updated in gcal
              await Promise.all(
                otherInstances.map((instance) =>
                  expect(
                    EventDriver.getGCalEvent(
                      user._id,
                      InstanceEventMetadataSchema.parse(instance.metadata).id,
                      calendar.metadata.id,
                    ),
                  ).resolves.toEqual(
                    expect.objectContaining({
                      id: instance.metadata?.id,
                      extendedProperties: expect.objectContaining({
                        private: expect.objectContaining({
                          priority: base.priority,
                        }),
                      }),
                    }),
                  ),
                ),
              );
              break;
            }
          }
        });

        it("should update the startDate field of an event", async () => {
          const user = await AuthDriver.googleSignup();
          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
          const { baseEvent: base, instances } =
            await validateBaseEvent(calendar);

          const instanceUpdate = faker.helpers.arrayElement(instances);

          const { otherInstances, updatedInstance } =
            await preValidateInstanceEventUpdate(instanceUpdate, calendar, {
              startDate: faker.date.past({
                refDate: instanceUpdate.startDate,
              }),
            });

          // check that other instances were not updated
          await Promise.all(
            otherInstances.map((instance) => {
              expect(instance.startDate).not.toEqual(instanceUpdate.startDate);
            }),
          );

          // check that the base event was not updated
          const baseEvent = await eventService.readById(calendar._id, base._id);

          expect(baseEvent).toEqual(
            expect.objectContaining({ startDate: base.startDate }),
          );

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              // check that the event was updated in gcal
              await testCompassEventInGcal(updatedInstance);

              // check that the base event has not been updated in gcal
              await expect(
                EventDriver.getGCalEvent(
                  user._id,
                  StandaloneEventMetadataSchema.parse(baseEvent.metadata).id,
                  calendar.metadata.id,
                ),
              ).resolves.toEqual(
                expect.objectContaining({
                  id: base.metadata?.id,
                  ...eventDatesToGcalDates(base),
                }),
              );

              // check that other instances were not updated in gcal
              await Promise.all(
                otherInstances.map((instance) =>
                  expect(
                    EventDriver.getGCalEvent(
                      user._id,
                      InstanceEventMetadataSchema.parse(instance.metadata).id,
                      calendar.metadata.id,
                    ),
                  ).resolves.toEqual(
                    expect.objectContaining({
                      id: instance.metadata?.id,
                      ...eventDatesToGcalDates(instance),
                    }),
                  ),
                ),
              );
              break;
            }
          }
        });

        it("should update the endDate field of an event", async () => {
          const user = await AuthDriver.googleSignup();
          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
          const { baseEvent: base, instances } =
            await validateBaseEvent(calendar);

          const instanceUpdate = faker.helpers.arrayElement(instances);

          const { otherInstances, updatedInstance } =
            await preValidateInstanceEventUpdate(instanceUpdate, calendar, {
              endDate: faker.date.future({
                refDate: instanceUpdate.endDate,
              }),
            });

          // check that other instances were not updated
          await Promise.all(
            otherInstances.map((instance) => {
              expect(instance.endDate).not.toEqual(instanceUpdate.endDate);
            }),
          );

          // check that the base event was not updated
          const baseEvent = await eventService.readById(calendar._id, base._id);

          expect(baseEvent).toEqual(
            expect.objectContaining({ endDate: base.endDate }),
          );

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              // check that the event was updated in gcal
              await testCompassEventInGcal(updatedInstance);

              // check that the base event has not been updated in gcal
              await expect(
                EventDriver.getGCalEvent(
                  user._id,
                  StandaloneEventMetadataSchema.parse(baseEvent.metadata).id,
                  calendar.metadata.id,
                ),
              ).resolves.toEqual(
                expect.objectContaining({
                  id: base.metadata?.id,
                  ...eventDatesToGcalDates(base),
                }),
              );

              // check that other instances were not updated in gcal
              await Promise.all(
                otherInstances.map((instance) =>
                  expect(
                    EventDriver.getGCalEvent(
                      user._id,
                      InstanceEventMetadataSchema.parse(instance.metadata).id,
                      calendar.metadata.id,
                    ),
                  ).resolves.toEqual(
                    expect.objectContaining({
                      id: instance.metadata?.id,
                      ...eventDatesToGcalDates(instance),
                    }),
                  ),
                ),
              );
              break;
            }
          }
        });

        it("should not update the recurrence field of an instance event", async () => {
          const user = await AuthDriver.googleSignup();
          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
          const { instances } = await validateBaseEvent(calendar, {
            priority: Priorities.WORK,
          });

          const instance = faker.helpers.arrayElement(instances);

          const payload = InstanceEventSchema.parse({
            ...instance,
            recurrence: {
              ...instance.recurrence,
              rule: ["RRULE:FREQ=WEEKLY;COUNT=5"],
            },
          });

          await CompassSyncProcessor.processEvents([
            {
              payload,
              calendar,
              providerSync: true,
              applyTo: RecurringEventUpdateScope.THIS_EVENT,
              status: EventStatus.CONFIRMED,
            },
          ]);

          const updatedInstance = await eventService.readById(
            calendar._id,
            instance._id,
          );

          expect(updatedInstance.recurrence).toEqual(instance.recurrence);
        });
      });

      describe("Transition Edits: ", () => {
        it("should not update the isSomeday(to true) field of an event - to instance someday event", async () => {
          const user = await AuthDriver.googleSignup();
          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
          const { instances } = await validateBaseEvent(calendar, {
            priority: Priorities.WORK,
            isSomeday: false,
          });

          const instanceUpdate = faker.helpers.arrayElement(instances);

          const payload = InstanceEventSchema.parse({
            ...instanceUpdate,
            isSomeday: true,
          });

          await CompassSyncProcessor.processEvents([
            {
              payload,
              calendar,
              providerSync: true,
              applyTo: RecurringEventUpdateScope.THIS_EVENT,
              status: EventStatus.CONFIRMED,
            },
          ]);

          const updatedInstance = await eventService.readById(
            calendar._id,
            instanceUpdate._id,
          );

          expect(updatedInstance.isSomeday).toBe(false);
        });
      });
    });
  });

  describe("Delete - Instance Event: ", () => {
    it("should delete a calendar event", async () => {
      const user = await AuthDriver.googleSignup();
      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
      const { instances } = await validateBaseEvent(calendar, {
        priority: Priorities.WORK,
      });

      const payload = faker.helpers.arrayElement(instances);

      expect(payload).toBeDefined();

      const deleteChanges = await CompassSyncProcessor.processEvents([
        {
          payload,
          calendar,
          providerSync: true,
          applyTo: RecurringEventUpdateScope.THIS_EVENT,
          status: EventStatus.CANCELLED,
        },
      ]);

      expect(deleteChanges).toEqual(
        expect.arrayContaining([
          {
            calendar: calendar._id,
            user: user._id,
            id: payload._id,
            title: payload.title,
            transition: [
              "RECURRENCE_INSTANCE",
              TransitionCategoriesRecurrence.RECURRENCE_INSTANCE_CANCELLED,
            ],
            category: Categories_Recurrence.RECURRENCE_INSTANCE,
            operation: "RECURRENCE_INSTANCE_DELETED",
          },
        ]),
      );

      // check that event is deleted in db
      await expect(
        eventService.readById(calendar._id, payload._id),
      ).rejects.toThrow();

      // check that other instances still exist
      const otherInstances = await mongoService.event
        .find({
          calendar: calendar._id,
          "recurrence.eventId": payload.recurrence.eventId,
          $expr: baseEventExclusionFilterExpr,
        })
        .toArray();

      expect(otherInstances).toHaveLength(9); // 10 - 1 deleted

      // check that the base event still exist
      const baseEvent = await eventService.readById(
        calendar._id,
        payload.recurrence.eventId,
      );

      expect(baseEvent).toBeDefined();

      switch (calendar.metadata.provider) {
        case CalendarProvider.GOOGLE:
          // check that event has been deleted in gcal
          await expect(
            EventDriver.getGCalEvent(
              user._id,
              InstanceEventMetadataSchema.parse(payload.metadata).id,
              calendar.metadata.id,
            ),
          ).rejects.toThrow(
            new Error(`Event with id ${payload.metadata?.id} not found`),
          );

          // check that the base event has not been deleted in gcal
          await expect(
            EventDriver.getGCalEvent(
              user._id,
              InstanceEventMetadataSchema.parse(payload.metadata)
                .recurringEventId,
              calendar.metadata.id,
            ),
          ).resolves.toEqual(
            expect.objectContaining({
              id: payload.metadata?.recurringEventId,
            }),
          );

          // check that other instances still exist in gcal
          await Promise.all(
            otherInstances.map((instance) =>
              expect(
                EventDriver.getGCalEvent(
                  user._id,
                  InstanceEventMetadataSchema.parse(instance.metadata).id,
                  calendar.metadata.id,
                ),
              ).resolves.toEqual(
                expect.objectContaining({
                  id: instance.metadata?.id,
                }),
              ),
            ),
          );
          break;
      }
    });
  });
});
