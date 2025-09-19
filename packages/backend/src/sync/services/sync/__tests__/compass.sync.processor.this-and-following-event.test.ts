import { WithId } from "mongodb";
import { faker } from "@faker-js/faker";
import { Priorities } from "@core/constants/core.constants";
import {
  CalendarProvider,
  Categories_Recurrence,
  CompassEventStatus,
  CompassThisAndFollowingEvent,
  CompassThisEvent,
  RecurringEventUpdateScope,
  Schema_Event,
  Schema_Event_Recur_Base,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { parseCompassEventDate } from "@core/util/event/event.util";
import { createMockBaseEvent } from "@core/util/test/ccal.event.factory";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
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
import eventService, { _getGcal } from "@backend/event/services/event.service";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";

describe.each([{ calendarProvider: CalendarProvider.GOOGLE }])(
  `CompassSyncProcessor $calendarProvider calendar: ${RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS}`,
  ({ calendarProvider }) => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    describe("Update - Instance Event: ", () => {
      describe("Calendar: ", () => {
        describe("Basic Edits: ", () => {
          it("should update the title field of an event and those of the following instances in its base recurrence", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const isSomeday = false;
            const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
            const payload = createMockBaseEvent(
              { isSomeday, user, recurrence },
              true,
            );

            const changes = await CompassSyncProcessor.processEvents([
              {
                payload: payload as CompassThisEvent["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: CompassEventStatus.CONFIRMED,
              },
            ]);

            expect(changes).toEqual(
              expect.arrayContaining([
                {
                  title: payload.title,
                  transition: [null, "RECURRENCE_BASE_CONFIRMED"],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "RECURRENCE_BASE_CREATED",
                },
              ]),
            );

            const { baseEvent, instances } = await testCompassSeries(
              payload,
              10,
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventInGcal(baseEvent);
                break;
            }

            const instanceIndex = faker.number.int({
              min: 0,
              max: instances.length - 1,
            });

            const splitInstance = instances[instanceIndex]!;
            const splitInstanceId = splitInstance._id.toString();
            const isFirstInstance = instanceIndex === 0;

            expect(splitInstance).toBeDefined();

            const updatedPayload = {
              ...splitInstance,
              recurrence: {
                rule: baseEvent.recurrence?.rule,
                eventId: baseEvent._id.toString(),
              },
              _id: splitInstanceId,
              title: faker.lorem.sentence(3),
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload:
                  updatedPayload as CompassThisAndFollowingEvent["payload"],
                applyTo: RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS,
                status: CompassEventStatus.CONFIRMED,
              },
            ]);

            if (!isFirstInstance) {
              expect(updateChanges).toEqual(
                expect.arrayContaining([
                  {
                    title: baseEvent.title,
                    transition: [
                      "RECURRENCE_BASE",
                      "RECURRENCE_BASE_CONFIRMED",
                    ],
                    category: Categories_Recurrence.RECURRENCE_BASE,
                    operation: "RECURRENCE_BASE_UPDATED",
                  },
                  {
                    title: updatedPayload.title,
                    transition: [null, "RECURRENCE_BASE_CONFIRMED"],
                    category: Categories_Recurrence.RECURRENCE_BASE,
                    operation: "RECURRENCE_BASE_CREATED",
                  },
                ]),
              );

              await Promise.all(
                instances
                  .slice(instanceIndex)
                  .map(async ({ _id }) =>
                    expect(
                      eventService.readById(user, _id.toString()),
                    ).rejects.toThrow(
                      `Tried with user: ${user} and _id: ${_id.toString()}`,
                    ),
                  ),
              );

              delete (baseEvent as unknown as Schema_Event).recurrence;

              const { baseEvent: oldBaseEvent, instances: oldInstances } =
                await testCompassSeries(
                  { ...baseEvent, _id: baseEvent._id.toString() },
                  instanceIndex,
                );

              const rrule = oldBaseEvent.recurrence?.rule?.find((rule) =>
                rule.startsWith("RRULE"),
              );

              expect(rrule).toBeDefined();

              const until = rrule?.match(/UNTIL=(\d{8}T\d{6}Z?)/)?.[1];

              expect(until).toBeDefined();

              const untilDay = dayjs(until!, dayjs.DateFormat.RFC5545);

              oldInstances.forEach(({ startDate }) =>
                expect(
                  parseCompassEventDate(startDate!).isSameOrBefore(untilDay),
                ).toBe(true),
              );

              const newSeriesBase = (await mongoService.event.findOne({
                user,
                startDate: splitInstance.startDate,
                endDate: splitInstance.endDate,
                title: updatedPayload.title,
              })) as WithId<Omit<Schema_Event_Recur_Base, "_id">>;

              expect(newSeriesBase).toBeDefined();

              const { baseEvent: newBaseEvent, instances: newInstances } =
                await testCompassSeries(
                  { ...newSeriesBase, _id: newSeriesBase._id.toString() },
                  instances.length - instanceIndex,
                );

              const newRrule = newBaseEvent.recurrence?.rule?.find((rule) =>
                rule.startsWith("RRULE"),
              );

              expect(newRrule).toBeDefined();

              const newUntil = newRrule?.match(/UNTIL=(\d{8}T\d{6}Z?)/)?.[1];

              expect(newUntil).toBeDefined();

              const newUntilDay = dayjs(newUntil!, dayjs.DateFormat.RFC5545);

              newInstances.forEach(({ startDate, title }) => {
                expect(
                  parseCompassEventDate(startDate!).isSameOrBefore(newUntilDay),
                ).toBe(true);

                expect(title).toBe(updatedPayload.title);
              });

              expect(newUntilDay.isAfter(untilDay)).toBe(true);

              switch (calendarProvider) {
                case CalendarProvider.GOOGLE: {
                  // enable if we mock recurrence changes in gcal
                  // instances.slice(instanceIndex).forEach(async (instance) => {
                  //   await testCompassEventNotInGcal(instance);
                  // });

                  newInstances.forEach(async (instance) => {
                    const gEvent = await testCompassEventInGcal(instance);

                    expect(gEvent.summary).toBe(updatedPayload.title);
                  });
                  break;
                }
              }
            } else {
              expect(updateChanges).toEqual(
                expect.arrayContaining([
                  {
                    title: updatedPayload.title,
                    transition: [
                      "RECURRENCE_BASE",
                      "RECURRENCE_BASE_CONFIRMED",
                    ],
                    category: Categories_Recurrence.RECURRENCE_BASE,
                    operation: "RECURRENCE_BASE_UPDATED",
                  },
                ]),
              );

              const {
                baseEvent: updatedBaseEvent,
                instances: updatedInstances,
              } = await testCompassSeries(
                {
                  ...baseEvent,
                  title: updatedPayload.title,
                  _id: baseEvent._id.toString(),
                },
                instances.length,
              );

              updatedInstances.forEach(({ title }) => {
                expect(title).toBe(updatedPayload.title);
              });

              switch (calendarProvider) {
                case CalendarProvider.GOOGLE:
                  await testCompassEventInGcal(updatedBaseEvent);

                  updatedInstances.forEach(async (instance) => {
                    const gEvent = await testCompassEventInGcal(instance);

                    expect(gEvent.summary).toBe(updatedPayload.title);
                  });
                  break;
              }
            }
          });

          it("should update the description field of an event and those of the following instances in its base recurrence", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const isSomeday = false;
            const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
            const payload = createMockBaseEvent(
              { isSomeday, user, recurrence },
              true,
            );

            const changes = await CompassSyncProcessor.processEvents([
              {
                payload: payload as CompassThisEvent["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: CompassEventStatus.CONFIRMED,
              },
            ]);

            expect(changes).toEqual(
              expect.arrayContaining([
                {
                  title: payload.title,
                  transition: [null, "RECURRENCE_BASE_CONFIRMED"],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "RECURRENCE_BASE_CREATED",
                },
              ]),
            );

            const { baseEvent, instances } = await testCompassSeries(
              payload,
              10,
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventInGcal(baseEvent);
                break;
            }

            const instanceIndex = faker.number.int({
              min: 0,
              max: instances.length - 1,
            });

            const splitInstance = instances[instanceIndex]!;
            const splitInstanceId = splitInstance._id.toString();
            const isFirstInstance = instanceIndex === 0;

            expect(splitInstance).toBeDefined();

            const updatedPayload = {
              ...splitInstance,
              recurrence: {
                rule: baseEvent.recurrence?.rule,
                eventId: baseEvent._id.toString(),
              },
              _id: splitInstanceId,
              description: faker.lorem.sentence(3),
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload:
                  updatedPayload as CompassThisAndFollowingEvent["payload"],
                applyTo: RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS,
                status: CompassEventStatus.CONFIRMED,
              },
            ]);

            if (!isFirstInstance) {
              expect(updateChanges).toEqual(
                expect.arrayContaining([
                  {
                    title: baseEvent.title,
                    transition: [
                      "RECURRENCE_BASE",
                      "RECURRENCE_BASE_CONFIRMED",
                    ],
                    category: Categories_Recurrence.RECURRENCE_BASE,
                    operation: "RECURRENCE_BASE_UPDATED",
                  },
                  {
                    title: updatedPayload.title,
                    transition: [null, "RECURRENCE_BASE_CONFIRMED"],
                    category: Categories_Recurrence.RECURRENCE_BASE,
                    operation: "RECURRENCE_BASE_CREATED",
                  },
                ]),
              );

              await Promise.all(
                instances
                  .slice(instanceIndex)
                  .map(async ({ _id }) =>
                    expect(
                      eventService.readById(user, _id.toString()),
                    ).rejects.toThrow(
                      `Tried with user: ${user} and _id: ${_id.toString()}`,
                    ),
                  ),
              );

              delete (baseEvent as unknown as Schema_Event).recurrence;

              const { baseEvent: oldBaseEvent, instances: oldInstances } =
                await testCompassSeries(
                  { ...baseEvent, _id: baseEvent._id.toString() },
                  instanceIndex,
                );

              const rrule = oldBaseEvent.recurrence?.rule?.find((rule) =>
                rule.startsWith("RRULE"),
              );

              expect(rrule).toBeDefined();

              const until = rrule?.match(/UNTIL=(\d{8}T\d{6}Z?)/)?.[1];

              expect(until).toBeDefined();

              const untilDay = dayjs(until!, dayjs.DateFormat.RFC5545);

              oldInstances.forEach(({ startDate }) =>
                expect(
                  parseCompassEventDate(startDate!).isSameOrBefore(untilDay),
                ).toBe(true),
              );

              const newSeriesBase = (await mongoService.event.findOne({
                user,
                startDate: splitInstance.startDate,
                endDate: splitInstance.endDate,
                description: updatedPayload.description,
              })) as WithId<Omit<Schema_Event_Recur_Base, "_id">>;

              expect(newSeriesBase).toBeDefined();

              const { baseEvent: newBaseEvent, instances: newInstances } =
                await testCompassSeries(
                  { ...newSeriesBase, _id: newSeriesBase._id.toString() },
                  instances.length - instanceIndex,
                );

              const newRrule = newBaseEvent.recurrence?.rule?.find((rule) =>
                rule.startsWith("RRULE"),
              );

              expect(newRrule).toBeDefined();

              const newUntil = newRrule?.match(/UNTIL=(\d{8}T\d{6}Z?)/)?.[1];

              expect(newUntil).toBeDefined();

              const newUntilDay = dayjs(newUntil!, dayjs.DateFormat.RFC5545);

              newInstances.forEach(({ startDate, description }) => {
                expect(
                  parseCompassEventDate(startDate!).isSameOrBefore(newUntilDay),
                ).toBe(true);

                expect(description).toBe(updatedPayload.description);
              });

              expect(newUntilDay.isAfter(untilDay)).toBe(true);

              switch (calendarProvider) {
                case CalendarProvider.GOOGLE: {
                  // enable if we mock recurrence changes in gcal
                  // instances.slice(instanceIndex).forEach(async (instance) => {
                  //   await testCompassEventNotInGcal(instance);
                  // });

                  newInstances.forEach(async (instance) => {
                    const gEvent = await testCompassEventInGcal(instance);

                    expect(gEvent.description).toBe(updatedPayload.description);
                  });
                  break;
                }
              }
            } else {
              expect(updateChanges).toEqual(
                expect.arrayContaining([
                  {
                    title: updatedPayload.title,
                    transition: [
                      "RECURRENCE_BASE",
                      "RECURRENCE_BASE_CONFIRMED",
                    ],
                    category: Categories_Recurrence.RECURRENCE_BASE,
                    operation: "RECURRENCE_BASE_UPDATED",
                  },
                ]),
              );

              const {
                baseEvent: updatedBaseEvent,
                instances: updatedInstances,
              } = await testCompassSeries(
                {
                  ...baseEvent,
                  description: updatedPayload.description,
                  _id: baseEvent._id.toString(),
                },
                instances.length,
              );

              updatedInstances.forEach(({ description }) => {
                expect(description).toBe(updatedPayload.description);
              });

              switch (calendarProvider) {
                case CalendarProvider.GOOGLE:
                  await testCompassEventInGcal(updatedBaseEvent);

                  updatedInstances.forEach(async (instance) => {
                    const gEvent = await testCompassEventInGcal(instance);

                    expect(gEvent.description).toBe(updatedPayload.description);
                  });
                  break;
              }
            }
          });

          it("should update the priority field of an event and those of the following instances in its base recurrence", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const isSomeday = false;
            const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
            const payload = createMockBaseEvent({
              isSomeday,
              user,
              recurrence,
              priority: Priorities.SELF,
            });

            const changes = await CompassSyncProcessor.processEvents([
              {
                payload: payload as CompassThisEvent["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: CompassEventStatus.CONFIRMED,
              },
            ]);

            expect(changes).toEqual(
              expect.arrayContaining([
                {
                  title: payload.title,
                  transition: [null, "RECURRENCE_BASE_CONFIRMED"],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "RECURRENCE_BASE_CREATED",
                },
              ]),
            );

            const { baseEvent, instances } = await testCompassSeries(
              payload,
              10,
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventInGcal(baseEvent);
                break;
            }

            const instanceIndex = faker.number.int({
              min: 0,
              max: instances.length - 1,
            });

            const splitInstance = instances[instanceIndex]!;
            const splitInstanceId = splitInstance._id.toString();
            const isFirstInstance = instanceIndex === 0;

            expect(splitInstance).toBeDefined();

            const updatedPayload = {
              ...splitInstance,
              recurrence: {
                rule: baseEvent.recurrence?.rule,
                eventId: baseEvent._id.toString(),
              },
              _id: splitInstanceId,
              priority: Priorities.RELATIONS,
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload:
                  updatedPayload as CompassThisAndFollowingEvent["payload"],
                applyTo: RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS,
                status: CompassEventStatus.CONFIRMED,
              },
            ]);

            if (!isFirstInstance) {
              expect(updateChanges).toEqual(
                expect.arrayContaining([
                  {
                    title: baseEvent.title,
                    transition: [
                      "RECURRENCE_BASE",
                      "RECURRENCE_BASE_CONFIRMED",
                    ],
                    category: Categories_Recurrence.RECURRENCE_BASE,
                    operation: "RECURRENCE_BASE_UPDATED",
                  },
                  {
                    title: updatedPayload.title,
                    transition: [null, "RECURRENCE_BASE_CONFIRMED"],
                    category: Categories_Recurrence.RECURRENCE_BASE,
                    operation: "RECURRENCE_BASE_CREATED",
                  },
                ]),
              );

              await Promise.all(
                instances
                  .slice(instanceIndex)
                  .map(async ({ _id }) =>
                    expect(
                      eventService.readById(user, _id.toString()),
                    ).rejects.toThrow(
                      `Tried with user: ${user} and _id: ${_id.toString()}`,
                    ),
                  ),
              );

              delete (baseEvent as unknown as Schema_Event).recurrence;

              const { baseEvent: oldBaseEvent, instances: oldInstances } =
                await testCompassSeries(
                  { ...baseEvent, _id: baseEvent._id.toString() },
                  instanceIndex,
                );

              const rrule = oldBaseEvent.recurrence?.rule?.find((rule) =>
                rule.startsWith("RRULE"),
              );

              expect(rrule).toBeDefined();

              const until = rrule?.match(/UNTIL=(\d{8}T\d{6}Z?)/)?.[1];

              expect(until).toBeDefined();

              const untilDay = dayjs(until!, dayjs.DateFormat.RFC5545);

              oldInstances.forEach(({ startDate }) =>
                expect(
                  parseCompassEventDate(startDate!).isSameOrBefore(untilDay),
                ).toBe(true),
              );

              const newSeriesBase = (await mongoService.event.findOne({
                user,
                startDate: splitInstance.startDate,
                endDate: splitInstance.endDate,
                priority: updatedPayload.priority,
              })) as WithId<Omit<Schema_Event_Recur_Base, "_id">>;

              expect(newSeriesBase).toBeDefined();

              const { baseEvent: newBaseEvent, instances: newInstances } =
                await testCompassSeries(
                  { ...newSeriesBase, _id: newSeriesBase._id.toString() },
                  instances.length - instanceIndex,
                );

              const newRrule = newBaseEvent.recurrence?.rule?.find((rule) =>
                rule.startsWith("RRULE"),
              );

              expect(newRrule).toBeDefined();

              const newUntil = newRrule?.match(/UNTIL=(\d{8}T\d{6}Z?)/)?.[1];

              expect(newUntil).toBeDefined();

              const newUntilDay = dayjs(newUntil!, dayjs.DateFormat.RFC5545);

              newInstances.forEach(({ startDate, priority }) => {
                expect(
                  parseCompassEventDate(startDate!).isSameOrBefore(newUntilDay),
                ).toBe(true);

                expect(priority).toBe(updatedPayload.priority);
              });

              expect(newUntilDay.isAfter(untilDay)).toBe(true);

              switch (calendarProvider) {
                case CalendarProvider.GOOGLE: {
                  // enable if we mock recurrence changes in gcal
                  // instances.slice(instanceIndex).forEach(async (instance) => {
                  //   await testCompassEventNotInGcal(instance);
                  // });

                  newInstances.forEach(async (instance) => {
                    const gEvent = await testCompassEventInGcal(instance);

                    expect(
                      gEvent.extendedProperties?.private?.["priority"],
                    ).toBe(updatedPayload.priority);
                  });
                  break;
                }
              }
            } else {
              expect(updateChanges).toEqual(
                expect.arrayContaining([
                  {
                    title: updatedPayload.title,
                    transition: [
                      "RECURRENCE_BASE",
                      "RECURRENCE_BASE_CONFIRMED",
                    ],
                    category: Categories_Recurrence.RECURRENCE_BASE,
                    operation: "RECURRENCE_BASE_UPDATED",
                  },
                ]),
              );

              const {
                baseEvent: updatedBaseEvent,
                instances: updatedInstances,
              } = await testCompassSeries(
                {
                  ...baseEvent,
                  priority: updatedPayload.priority,
                  _id: baseEvent._id.toString(),
                },
                instances.length,
              );

              updatedInstances.forEach(({ priority }) => {
                expect(priority).toBe(updatedPayload.priority);
              });

              switch (calendarProvider) {
                case CalendarProvider.GOOGLE:
                  await testCompassEventInGcal(updatedBaseEvent);

                  updatedInstances.forEach(async (instance) => {
                    const gEvent = await testCompassEventInGcal(instance);

                    expect(
                      gEvent.extendedProperties?.private?.["priority"],
                    ).toBe(updatedPayload.priority);
                  });
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
        const { user: _user } = await UtilDriver.setupTestUser();
        const user = _user._id.toString();
        const isSomeday = false;
        const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
        const payload = createMockBaseEvent(
          { isSomeday, user, recurrence },
          true,
        );

        const changes = await CompassSyncProcessor.processEvents([
          {
            payload: payload as CompassThisEvent["payload"],
            applyTo: RecurringEventUpdateScope.THIS_EVENT,
            status: CompassEventStatus.CONFIRMED,
          },
        ]);

        expect(changes).toEqual(
          expect.arrayContaining([
            {
              title: payload.title,
              transition: [null, "RECURRENCE_BASE_CONFIRMED"],
              category: Categories_Recurrence.RECURRENCE_BASE,
              operation: "RECURRENCE_BASE_CREATED",
            },
          ]),
        );

        const { baseEvent, instances } = await testCompassSeries(payload, 10);

        switch (calendarProvider) {
          case CalendarProvider.GOOGLE:
            await testCompassEventInGcal(baseEvent);
            break;
        }

        const instanceIndex = instances.length - 1; // test deleting from first instance

        const splitInstance = instances[instanceIndex]!;
        const splitInstanceId = splitInstance._id.toString();
        const isFirstInstance = instanceIndex === 0;

        expect(splitInstance).toBeDefined();

        const updatedPayload = {
          ...splitInstance,
          recurrence: {
            rule: baseEvent.recurrence?.rule,
            eventId: baseEvent._id.toString(),
          },
          _id: splitInstanceId,
        };

        const updateChanges = await CompassSyncProcessor.processEvents([
          {
            payload: updatedPayload as CompassThisAndFollowingEvent["payload"],
            applyTo: RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS,
            status: CompassEventStatus.CANCELLED,
          },
        ]);

        if (!isFirstInstance) {
          expect(updateChanges).toEqual(
            expect.arrayContaining([
              {
                title: baseEvent.title,
                transition: ["RECURRENCE_BASE", "RECURRENCE_BASE_CONFIRMED"],
                category: Categories_Recurrence.RECURRENCE_BASE,
                operation: "RECURRENCE_BASE_UPDATED",
              },
            ]),
          );

          await Promise.all(
            instances
              .slice(instanceIndex)
              .map(async ({ _id }) =>
                expect(
                  eventService.readById(user, _id.toString()),
                ).rejects.toThrow(
                  `Tried with user: ${user} and _id: ${_id.toString()}`,
                ),
              ),
          );

          delete (baseEvent as unknown as Schema_Event).recurrence;

          const { baseEvent: oldBaseEvent, instances: oldInstances } =
            await testCompassSeries(
              { ...baseEvent, _id: baseEvent._id.toString() },
              instanceIndex,
            );

          const rrule = oldBaseEvent.recurrence?.rule?.find((rule) =>
            rule.startsWith("RRULE"),
          );

          expect(rrule).toBeDefined();

          const until = rrule?.match(/UNTIL=(\d{8}T\d{6}Z?)/)?.[1];

          expect(until).toBeDefined();

          const untilDay = dayjs(until!, dayjs.DateFormat.RFC5545);

          oldInstances.forEach(({ startDate }) =>
            expect(
              parseCompassEventDate(startDate!).isSameOrBefore(untilDay),
            ).toBe(true),
          );

          switch (calendarProvider) {
            case CalendarProvider.GOOGLE: {
              // enable if we mock recurrence changes in gcal
              oldInstances.slice(instanceIndex).forEach(async (instance) => {
                await testCompassEventNotInGcal(instance);
              });
              break;
            }
          }
        } else {
          expect(updateChanges).toEqual(
            expect.arrayContaining([
              {
                title: updatedPayload.title,
                transition: ["RECURRENCE_BASE", "RECURRENCE_BASE_CANCELLED"],
                category: Categories_Recurrence.RECURRENCE_BASE,
                operation: "RECURRENCE_BASE_DELETED",
              },
            ]),
          );

          await expect(
            eventService.readById(user, baseEvent._id.toString()),
          ).rejects.toThrow();

          await expect(
            eventService.readById(user, baseEvent._id.toString()),
          ).rejects.toThrow();

          await Promise.all(
            instances.map(async ({ _id }) =>
              expect(
                eventService.readById(user, _id.toString()),
              ).rejects.toThrow(
                `Tried with user: ${user} and _id: ${_id.toString()}`,
              ),
            ),
          );

          switch (calendarProvider) {
            case CalendarProvider.GOOGLE:
              await expect(
                _getGcal(user, baseEvent._id.toString()!),
              ).rejects.toThrow(
                `Event with id ${baseEvent._id.toString()} not found`,
              );

              instances.forEach(async (instance) => {
                await expect(
                  _getGcal(user, instance._id.toString()!),
                ).rejects.toThrow(
                  `Event with id ${instance._id.toString()} not found`,
                );
              });
              break;
          }
        }
      });
    });
  },
);
