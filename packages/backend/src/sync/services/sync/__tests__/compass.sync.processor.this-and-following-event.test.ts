import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";
import { Priorities } from "@core/constants/core.constants";
import { CalendarProvider } from "@core/types/calendar.types";
import {
  BaseEventSchema,
  Categories_Recurrence,
  EventStatus,
  InstanceEventSchema,
  RecurringEventUpdateScope,
  Schema_Event,
  TransitionCategoriesRecurrence,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { isBase, isInstance } from "@core/util/event/event.util";
import { createMockBaseEvent } from "@core/util/test/ccal.event.factory";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import { CalendarDriver } from "@backend/__tests__/drivers/calendar.driver";
import { EventDriver } from "@backend/__tests__/drivers/event.driver";
import { getEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import {
  testCompassEventInGcal,
  testCompassEventNotInGcal,
  testCompassSeries,
} from "@backend/event/classes/compass.event.parser.test.util";
import eventService from "@backend/event/services/event.service";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";
import userService from "@backend/user/services/user.service";

describe(`CompassSyncProcessor - ${RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS}`, () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  describe("Update - Instance Event: ", () => {
    describe("Calendar: ", () => {
      describe("Basic Edits: ", () => {
        it("should update the title field of an event and those of the following instances in its base recurrence", async () => {
          const user = await AuthDriver.googleSignup();
          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
          const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=2"] };
          const payload = createMockBaseEvent(
            { isSomeday: false, calendar: calendar._id, recurrence },
            true,
          );

          const changes = await CompassSyncProcessor.processEvents([
            {
              payload,
              providerSync: true,
              calendar,
              applyTo: RecurringEventUpdateScope.THIS_EVENT,
              status: EventStatus.CONFIRMED,
            },
          ]);

          expect(changes).toEqual(
            expect.arrayContaining([
              {
                title: payload.title,
                calendar: calendar._id,
                user: user._id,
                id: payload._id,
                transition: [
                  null,
                  TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
                ],
                category: Categories_Recurrence.RECURRENCE_BASE,
                operation: "SERIES_CREATED",
              },
            ]),
          );

          const { baseEvent, instances } = await testCompassSeries(payload, 2);

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE:
              await testCompassEventInGcal(baseEvent);
              break;
          }

          const instanceIndex = faker.number.int({
            min: 0,
            max: instances.length - 1,
          });

          const splitInstance = instances[instanceIndex]!;
          const isFirstInstance = dayjs(splitInstance.originalStartDate).isSame(
            baseEvent.startDate,
          );

          expect(splitInstance).toBeDefined();

          const updatedPayload = {
            ...splitInstance,
            title: faker.lorem.sentence(3),
          };

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              payload: updatedPayload,
              providerSync: true,
              calendar,
              applyTo: RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS,
              status: EventStatus.CONFIRMED,
            },
          ]);

          if (!isFirstInstance) {
            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  calendar: calendar._id,
                  user: user._id,
                  id: baseEvent._id,
                  title: baseEvent.title,
                  transition: [
                    "RECURRENCE_BASE",
                    TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
                  ],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "SERIES_UPDATED",
                },
                {
                  calendar: calendar._id,
                  user: user._id,
                  id: expect.any(ObjectId),
                  title: updatedPayload.title,
                  transition: [
                    null,
                    TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
                  ],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "SERIES_CREATED",
                },
              ]),
            );

            await Promise.all(
              instances
                .slice(instanceIndex)
                .map(async ({ _id }) =>
                  expect(
                    eventService.readById(calendar._id, _id),
                  ).rejects.toThrow(
                    `Tried with calendar: ${calendar._id.toString()} and _id: ${_id.toString()}`,
                  ),
                ),
            );

            delete (baseEvent as unknown as Schema_Event).recurrence;

            const { baseEvent: oldBaseEvent, instances: oldInstances } =
              await testCompassSeries(baseEvent, instanceIndex);

            const rrule = oldBaseEvent.recurrence?.rule?.find((rule) =>
              rule.startsWith("RRULE"),
            );

            expect(rrule).toBeDefined();

            const until = rrule?.match(/UNTIL=(\d{8}T\d{6}Z?)/)?.[1];

            expect(until).toBeDefined();

            const untilDay = dayjs(until!, dayjs.DateFormat.RFC5545);

            oldInstances.forEach(({ startDate }) =>
              expect(dayjs(startDate).isSameOrBefore(untilDay)).toBe(true),
            );

            const newSeriesBase = BaseEventSchema.parse(
              await mongoService.event.findOne({
                calendar: calendar._id,
                startDate: splitInstance.startDate,
                endDate: splitInstance.endDate,
                title: updatedPayload.title,
              }),
            );

            expect(newSeriesBase).toBeDefined();

            const { baseEvent: newBaseEvent, instances: newInstances } =
              await testCompassSeries(
                newSeriesBase,
                instances.length - (instanceIndex + 1),
              );

            const newRrule = newBaseEvent.recurrence?.rule?.find((rule) =>
              rule.startsWith("RRULE"),
            );

            expect(newRrule).toBeDefined();

            const newUntil = newRrule?.match(/UNTIL=(\d{8}T\d{6}Z?)/)?.[1];

            expect(newUntil).toBeDefined();

            const newUntilDay = dayjs(newUntil!, dayjs.DateFormat.RFC5545);

            newInstances.forEach(({ startDate, title }) => {
              expect(dayjs(startDate).isSameOrBefore(newUntilDay)).toBe(true);

              expect(title).toBe(updatedPayload.title);
            });

            expect(newUntilDay.isAfter(untilDay)).toBe(true);

            switch (calendar.metadata.provider) {
              case CalendarProvider.GOOGLE: {
                await Promise.all(
                  instances.slice(instanceIndex).map(async (instance) => {
                    Reflect.deleteProperty(instance, "metadata");
                    await testCompassEventNotInGcal(instance);
                  }),
                );

                await Promise.all(
                  newInstances.map(async (instance) => {
                    const gEvent = await testCompassEventInGcal(instance);

                    expect(gEvent.summary).toBe(updatedPayload.title);
                  }),
                );
                break;
              }
            }
          } else {
            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  calendar: calendar._id,
                  user: user._id,
                  id: baseEvent._id,
                  title: updatedPayload.title,
                  transition: [
                    "RECURRENCE_BASE",
                    TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
                  ],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "SERIES_UPDATED",
                },
              ]),
            );

            const { baseEvent: updatedBaseEvent, instances: updatedInstances } =
              await testCompassSeries(
                {
                  ...baseEvent,
                  title: updatedPayload.title,
                },
                instances.length,
              );

            updatedInstances.forEach(({ title }) => {
              expect(title).toBe(updatedPayload.title);
            });

            switch (calendar.metadata.provider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventInGcal(updatedBaseEvent);

                await Promise.all(
                  updatedInstances.map(async (instance) => {
                    const gEvent = await testCompassEventInGcal(instance);

                    expect(gEvent.summary).toBe(updatedPayload.title);
                  }),
                );
                break;
            }
          }
        });

        it("should update the description field of an event and those of the following instances in its base recurrence", async () => {
          const newUser = await AuthDriver.googleSignup();
          const user = await AuthDriver.googleLogin(newUser._id);
          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

          await userService.restartGoogleCalendarSync(user._id);

          const events = await getEventsInDb({
            calendar: calendar._id,
            isSomeday: false,
          });

          const baseEvent = BaseEventSchema.parse(
            faker.helpers.arrayElement(events.filter(isBase)),
          );

          const instances = events
            .filter((e) => e.recurrence?.eventId.equals(baseEvent._id))
            .filter(isInstance);

          const instanceIndex = faker.number.int({
            min: 0,
            max: instances.length - 1,
          });

          const splitInstance = instances[instanceIndex]!;
          const isFirstInstance = dayjs(splitInstance.originalStartDate).isSame(
            baseEvent.startDate,
          );

          expect(splitInstance).toBeDefined();

          const payload = InstanceEventSchema.parse({
            ...splitInstance,
            description: faker.lorem.sentence(3),
          });

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              payload,
              providerSync: true,
              calendar,
              applyTo: RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS,
              status: EventStatus.CONFIRMED,
            },
          ]);

          if (!isFirstInstance) {
            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  calendar: calendar._id,
                  user: user._id,
                  id: baseEvent._id,
                  title: baseEvent.title,
                  transition: [
                    "RECURRENCE_BASE",
                    TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
                  ],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "SERIES_UPDATED",
                },
                {
                  calendar: calendar._id,
                  user: user._id,
                  id: expect.any(ObjectId),
                  title: payload.title,
                  transition: [
                    null,
                    TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
                  ],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "SERIES_CREATED",
                },
              ]),
            );

            await Promise.all(
              instances
                .slice(instanceIndex)
                .map(async ({ _id }) =>
                  expect(
                    eventService.readById(calendar._id, _id),
                  ).rejects.toThrow(
                    `Tried with calendar: ${calendar._id.toString()} and _id: ${_id.toString()}`,
                  ),
                ),
            );

            const testBaseEvent = { ...baseEvent };

            // recurrence now modified after split with UNTIL rule
            Reflect.deleteProperty(testBaseEvent, "recurrence");

            const { baseEvent: oldBaseEvent, instances: oldInstances } =
              await testCompassSeries(testBaseEvent, instanceIndex);

            const rrule = oldBaseEvent.recurrence?.rule?.find((rule) =>
              rule.startsWith("RRULE"),
            );

            expect(rrule).toBeDefined();

            const until = rrule?.match(/UNTIL=(\d{8}T\d{6}Z?)/)?.[1];

            expect(until).toBeDefined();

            const untilDay = dayjs(until!, dayjs.DateFormat.RFC5545);

            oldInstances.forEach(({ startDate }) =>
              expect(dayjs(startDate).isSameOrBefore(untilDay)).toBe(true),
            );

            const newSeriesBase = BaseEventSchema.parse(
              await mongoService.event.findOne({
                calendar: calendar._id,
                startDate: splitInstance.startDate,
                endDate: splitInstance.endDate,
                description: payload.description,
              }),
            );

            expect(newSeriesBase).toBeDefined();

            const { baseEvent: newBaseEvent, instances: newInstances } =
              await testCompassSeries(
                newSeriesBase,
                instances.length - (instanceIndex + 1),
              );

            const newRrule = newBaseEvent.recurrence?.rule?.find((rule) =>
              rule.startsWith("RRULE"),
            );

            expect(newRrule).toBeDefined();

            const newUntil = newRrule?.match(/UNTIL=(\d{8}T\d{6}Z?)/)?.[1];

            expect(newUntil).toBeDefined();

            const newUntilDay = dayjs(newUntil!, dayjs.DateFormat.RFC5545);

            newInstances.forEach(({ startDate, description }) => {
              expect(dayjs(startDate!).isSameOrBefore(newUntilDay)).toBe(true);

              expect(description).toBe(payload.description);
            });

            expect(newUntilDay.isAfter(untilDay)).toBe(true);

            switch (calendar.metadata.provider) {
              case CalendarProvider.GOOGLE: {
                await Promise.all(
                  instances.slice(instanceIndex).map(async (instance) => {
                    Reflect.deleteProperty(instance, "metadata");
                    await testCompassEventNotInGcal(instance);
                  }),
                );

                await Promise.all(
                  newInstances.map(async (instance) => {
                    const gEvent = await testCompassEventInGcal(instance);

                    expect(gEvent.description).toBe(payload.description);
                  }),
                );
                break;
              }
            }
          } else {
            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  calendar: calendar._id,
                  user: user._id,
                  id: baseEvent._id,
                  title: payload.title,
                  transition: [
                    "RECURRENCE_BASE",
                    TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
                  ],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "SERIES_UPDATED",
                },
              ]),
            );

            const { baseEvent: updatedBaseEvent, instances: updatedInstances } =
              await testCompassSeries(
                {
                  ...baseEvent,
                  description: payload.description,
                },
                instances.length,
              );

            updatedInstances.forEach(({ description }) => {
              expect(description).toBe(payload.description);
            });

            switch (calendar.metadata.provider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventInGcal(updatedBaseEvent);

                await Promise.all(
                  updatedInstances.map(async (instance) => {
                    const gEvent = await testCompassEventInGcal(instance);

                    expect(gEvent.description).toBe(payload.description);
                  }),
                );
                break;
            }
          }
        });

        it("should update the priority field of an event and those of the following instances in its base recurrence", async () => {
          const user = await AuthDriver.googleSignup();
          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

          await userService.restartGoogleCalendarSync(user._id);

          const events = await getEventsInDb({
            calendar: calendar._id,
            isSomeday: false,
          });

          const baseEvent = BaseEventSchema.parse(
            faker.helpers.arrayElement(events.filter(isBase)),
          );

          const instances = events
            .filter((e) => e.recurrence?.eventId.equals(baseEvent._id))
            .filter(isInstance);

          const instanceIndex = faker.number.int({
            min: 0,
            max: instances.length - 1,
          });

          const splitInstance = instances[instanceIndex]!;
          const isFirstInstance = dayjs(splitInstance.originalStartDate).isSame(
            baseEvent.startDate,
          );

          expect(splitInstance).toBeDefined();

          const payload = InstanceEventSchema.parse({
            ...splitInstance,
            priority: Priorities.RELATIONS,
          });

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              payload,
              providerSync: true,
              calendar,
              applyTo: RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS,
              status: EventStatus.CONFIRMED,
            },
          ]);

          if (!isFirstInstance) {
            expect(updateChanges).toEqual(
              expect.arrayContaining([
                expect.objectContaining({
                  calendar: calendar._id,
                  user: user._id,
                  id: baseEvent._id,
                  title: baseEvent.title,
                  transition: [
                    "RECURRENCE_BASE",
                    TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
                  ],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "SERIES_UPDATED",
                }),
                expect.objectContaining({
                  calendar: calendar._id,
                  user: user._id,
                  id: expect.any(ObjectId),
                  title: splitInstance.title,
                  transition: [
                    null,
                    TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
                  ],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "SERIES_CREATED",
                }),
              ]),
            );

            await Promise.all(
              instances
                .slice(instanceIndex)
                .map(async ({ _id }) =>
                  expect(
                    eventService.readById(calendar._id, _id),
                  ).rejects.toThrow(
                    `Tried with calendar: ${calendar._id.toString()} and _id: ${_id.toString()}`,
                  ),
                ),
            );

            const testBaseEvent = { ...baseEvent };

            // recurrence now modified after split with UNTIL rule
            Reflect.deleteProperty(testBaseEvent, "recurrence");

            const { baseEvent: oldBaseEvent, instances: oldInstances } =
              await testCompassSeries(testBaseEvent, instanceIndex);

            const rrule = oldBaseEvent.recurrence?.rule?.find((rule) =>
              rule.startsWith("RRULE"),
            );

            expect(rrule).toBeDefined();

            const until = rrule?.match(/UNTIL=(\d{8}T\d{6}Z?)/)?.[1];

            expect(until).toBeDefined();

            const untilDay = dayjs(until!, dayjs.DateFormat.RFC5545);

            oldInstances.forEach(({ startDate }) =>
              expect(dayjs(startDate).isSameOrBefore(untilDay)).toBe(true),
            );

            const newSeriesBase = BaseEventSchema.parse(
              await mongoService.event.findOne({
                calendar: calendar._id,
                startDate: splitInstance.startDate,
                endDate: splitInstance.endDate,
                priority: payload.priority,
              }),
            );

            expect(newSeriesBase).toBeDefined();

            const { baseEvent: newBaseEvent, instances: newInstances } =
              await testCompassSeries(
                newSeriesBase,
                instances.length - (instanceIndex + 1),
              );

            const newRrule = newBaseEvent.recurrence?.rule?.find((rule) =>
              rule.startsWith("RRULE"),
            );

            expect(newRrule).toBeDefined();

            const newUntil = newRrule?.match(/UNTIL=(\d{8}T\d{6}Z?)/)?.[1];

            expect(newUntil).toBeDefined();

            const newUntilDay = dayjs(newUntil!, dayjs.DateFormat.RFC5545);

            newInstances.forEach(({ startDate, priority }) => {
              expect(dayjs(startDate).isSameOrBefore(newUntilDay)).toBe(true);

              expect(priority).toBe(payload.priority);
            });

            expect(newUntilDay.isAfter(untilDay)).toBe(true);

            switch (calendar.metadata.provider) {
              case CalendarProvider.GOOGLE: {
                await Promise.all(
                  instances.slice(instanceIndex).map(async (instance) => {
                    Reflect.deleteProperty(instance, "metadata");
                    await testCompassEventNotInGcal(instance);
                  }),
                );

                await Promise.all(
                  newInstances.map(async (instance) => {
                    const gEvent = await testCompassEventInGcal(instance);

                    expect(
                      gEvent.extendedProperties?.private?.["priority"],
                    ).toBe(payload.priority);
                  }),
                );
                break;
              }
            }
          } else {
            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  calendar: calendar._id,
                  user: user._id,
                  id: baseEvent._id,
                  title: baseEvent.title,
                  transition: [
                    "RECURRENCE_BASE",
                    TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
                  ],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "SERIES_UPDATED",
                },
              ]),
            );

            const { baseEvent: updatedBaseEvent, instances: updatedInstances } =
              await testCompassSeries(
                {
                  ...baseEvent,
                  priority: payload.priority,
                },
                instances.length,
              );

            updatedInstances.forEach(({ priority }) => {
              expect(priority).toBe(payload.priority);
            });

            switch (calendar.metadata.provider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventInGcal(updatedBaseEvent);

                await Promise.all(
                  updatedInstances.map(async (instance) => {
                    const gEvent = await testCompassEventInGcal(instance);

                    expect(
                      gEvent.extendedProperties?.private?.["priority"],
                    ).toBe(payload.priority);
                  }),
                );
                break;
            }
          }
        });
      });
    });
  });

  describe("Delete - Instance Event: ", () => {
    it("should delete this event and the following instances in its base recurrence", async () => {
      // create series
      const user = await AuthDriver.googleSignup();
      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
      const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
      const payload = createMockBaseEvent(
        { isSomeday: false, calendar: calendar._id, recurrence },
        true,
      );

      const changes = await CompassSyncProcessor.processEvents([
        {
          payload,
          providerSync: true,
          calendar,
          applyTo: RecurringEventUpdateScope.THIS_EVENT,
          status: EventStatus.CONFIRMED,
        },
      ]);

      expect(changes).toEqual(
        expect.arrayContaining([
          {
            calendar: calendar._id,
            user: user._id,
            id: payload._id,
            title: payload.title,
            transition: [
              null,
              TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
            ],
            category: Categories_Recurrence.RECURRENCE_BASE,
            operation: "SERIES_CREATED",
          },
        ]),
      );

      const { baseEvent, instances } = await testCompassSeries(payload, 10);

      switch (calendar.metadata.provider) {
        case CalendarProvider.GOOGLE:
          await testCompassEventInGcal(baseEvent);
          break;
      }

      const splitInstance = faker.helpers.arrayElement(instances);
      const isFirstInstance = dayjs(splitInstance.originalStartDate).isSame(
        baseEvent.startDate,
      );

      const instanceIndex = instances.findIndex(
        (instance) => instance._id === splitInstance._id,
      );

      expect(splitInstance).toBeDefined();
      expect(instanceIndex).toBeGreaterThanOrEqual(0);

      const updateChanges = await CompassSyncProcessor.processEvents([
        {
          payload: splitInstance,
          providerSync: true,
          calendar,
          applyTo: RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS,
          status: EventStatus.CANCELLED,
        },
      ]);

      if (!isFirstInstance) {
        expect(updateChanges).toEqual(
          expect.arrayContaining([
            {
              calendar: calendar._id,
              user: user._id,
              id: baseEvent._id,
              title: baseEvent.title,
              transition: [
                "RECURRENCE_BASE",
                TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
              ],
              category: Categories_Recurrence.RECURRENCE_BASE,
              operation: "SERIES_UPDATED",
            },
          ]),
        );

        await Promise.all(
          instances
            .slice(instanceIndex)
            .map(async ({ _id }) =>
              expect(eventService.readById(calendar._id, _id)).rejects.toThrow(
                `Tried with calendar: ${calendar._id.toString()} and _id: ${_id.toString()}`,
              ),
            ),
        );

        delete (baseEvent as unknown as Schema_Event).recurrence;

        const { baseEvent: oldBaseEvent, instances: oldInstances } =
          await testCompassSeries(baseEvent, instanceIndex);

        const rrule = oldBaseEvent.recurrence?.rule?.find((rule) =>
          rule.startsWith("RRULE"),
        );

        expect(rrule).toBeDefined();

        const until = rrule?.match(/UNTIL=(\d{8}T\d{6}Z?)/)?.[1];

        expect(until).toBeDefined();

        const untilDay = dayjs(until!, dayjs.DateFormat.RFC5545);

        oldInstances.forEach(({ startDate }) =>
          expect(dayjs(startDate).isSameOrBefore(untilDay)).toBe(true),
        );

        switch (calendar.metadata.provider) {
          case CalendarProvider.GOOGLE: {
            await Promise.all(
              oldInstances.slice(instanceIndex).map(async (instance) => {
                Reflect.deleteProperty(instance, "metadata");
                await testCompassEventNotInGcal(instance);
              }),
            );
            break;
          }
        }
      } else {
        expect(updateChanges).toEqual(
          expect.arrayContaining([
            {
              calendar: calendar._id,
              user: user._id,
              id: baseEvent._id,
              title: baseEvent.title,
              transition: [
                "RECURRENCE_BASE",
                TransitionCategoriesRecurrence.RECURRENCE_BASE_CANCELLED,
              ],
              category: Categories_Recurrence.RECURRENCE_BASE,
              operation: "SERIES_DELETED",
            },
          ]),
        );

        await expect(
          eventService.readById(calendar._id, baseEvent._id),
        ).rejects.toThrow();

        await expect(
          eventService.readById(calendar._id, baseEvent._id),
        ).rejects.toThrow();

        await Promise.all(
          instances.map(async ({ _id }) =>
            expect(eventService.readById(calendar._id, _id)).rejects.toThrow(
              `Tried with calendar: ${calendar._id.toString()} and _id: ${_id.toString()}`,
            ),
          ),
        );

        switch (calendar.metadata.provider) {
          case CalendarProvider.GOOGLE:
            await expect(
              EventDriver.getGCalEvent(
                calendar.user,
                baseEvent.metadata!.id,
                calendar.metadata.id,
              ),
            ).rejects.toThrow(
              `Event with id ${baseEvent.metadata?.id} not found`,
            );

            await Promise.all(
              instances.map(async (instance) => {
                await expect(
                  EventDriver.getGCalEvent(
                    calendar.user,
                    instance.metadata!.id,
                    calendar.metadata.id,
                  ),
                ).rejects.toThrow(
                  `Event with id ${instance.metadata?.id} not found`,
                );
              }),
            );
            break;
        }
      }
    });
  });
});
