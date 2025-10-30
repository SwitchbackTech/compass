import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";
import { Priorities } from "@core/constants/core.constants";
import { CalendarProvider } from "@core/types/calendar.types";
import {
  AllEventsUpdate,
  BaseEventSchema,
  Categories_Recurrence,
  EventMetadataSchema,
  EventStatus,
  EventUpdate,
  InstanceEventMetadataSchema,
  InstanceEventSchema,
  RecurringEventUpdateScope,
  Schema_Instance_Event,
  ThisEventUpdate,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
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
import { CompassEventParser } from "@backend/event/classes/compass.event.parser";
import {
  testCompassSeries,
  testCompassSeriesInGcal,
} from "@backend/event/classes/compass.event.parser.test.util";
import eventService from "@backend/event/services/event.service";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";
import { baseEventExclusionFilterExpr } from "../../../../event/services/event.service.util";

describe.each([{ calendarProvider: CalendarProvider.GOOGLE }])(
  `CompassSyncProcessor - $calendarProvider calendar: ${RecurringEventUpdateScope.ALL_EVENTS}`,
  ({ calendarProvider }) => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    describe("Update - Instance Event: ", () => {
      describe("Calendar: ", () => {
        describe("Basic Edits: ", () => {
          it("should update the title field of all events in the recurrence", async () => {
            const _user = await AuthDriver.googleSignup();
            const user = _user._id;
            const isSomeday = false;
            const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
            const payload = createMockBaseEvent({
              isSomeday,
              user,
              recurrence,
            });

            const changes = await CompassSyncProcessor.processEvents([
              {
                payload: payload as ThisEventUpdate["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: EventStatus.CONFIRMED,
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

            // check that event is in db
            const event = await eventService.readById(user, payload._id);

            expect(event).toEqual(
              expect.objectContaining({
                ...payload,
                isSomeday: false,
                updatedAt: expect.any(Date),
                origin: CalendarProvider.COMPASS,
              }),
            );

            expect(event).toHaveProperty("recurrence");

            // expect event to have instances
            const instances = await mongoService.event
              .find({
                calendar,
                "recurrence.eventId": event._id,
                $expr: baseEventExclusionFilterExpr,
              })
              .toArray();

            expect(instances).toHaveLength(10); // recurrence rule count

            expect(instances).toEqual(
              expect.arrayContaining(
                instances.map(() =>
                  expect.objectContaining({
                    recurrence: { eventId: event._id },
                    isSomeday: false,
                    updatedAt: expect.any(Date),
                    origin: CalendarProvider.COMPASS,
                  }),
                ),
              ),
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                // check that event has gcal attributes
                expect(event).toHaveProperty("gEventId");

                instances.forEach((instance) => {
                  expect(instance).toHaveProperty("gEventId");
                  expect(instance).toHaveProperty("gRecurringEventId");
                });

                // check that event exist in gcal
                const gcalEvent = await EventDriver.getGCalEvent(
                  user,
                  event.metadata?.id,
                );

                const gcalInstances = await Promise.all(
                  instances.map((instance) =>
                    EventDriver.getGCalEvent(user, instance.gEventId!),
                  ),
                );

                expect(gcalEvent).toHaveProperty("recurrence");

                expect(gcalEvent).toEqual(
                  expect.objectContaining({
                    id: event.gEventId,
                    recurrence: event.recurrence!.rule,
                  }),
                );

                expect(gcalInstances).toEqual(
                  expect.arrayContaining(
                    gcalInstances.map(() =>
                      expect.objectContaining({
                        recurringEventId: event!.gEventId,
                      }),
                    ),
                  ),
                );
                break;
              }
            }

            const instanceUpdate = instances[0]!;

            expect(instanceUpdate).toBeDefined();

            const updatedPayload = {
              ...instanceUpdate,
              _id: instanceUpdate._id.toString(),
              recurrence: {
                ...instanceUpdate.recurrence!,
                rule: event.recurrence!.rule,
              },
              title: faker.lorem.sentence(3),
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as AllEventsUpdate["payload"],
                applyTo: RecurringEventUpdateScope.ALL_EVENTS,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: ["RECURRENCE_BASE", "RECURRENCE_BASE_CONFIRMED"],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "RECURRENCE_BASE_UPDATED",
                },
              ]),
            );

            // check that event was updated in db
            const updatedBase = await mongoService.event.findOne({
              _id: new ObjectId(instanceUpdate.recurrence!.eventId),
              user,
            });

            expect(updatedBase).toBeDefined();

            expect(updatedBase).toEqual(
              expect.objectContaining({
                recurrence: { rule: event!.recurrence?.rule },
                title: updatedPayload.title,
                isSomeday: false,
                updatedAt: expect.any(Date),
                origin: CalendarProvider.COMPASS,
              }),
            );

            // check that other instances were updated
            const updatedInstances = await mongoService.event
              .find({
                calendar,
                "recurrence.eventId": event._id,
                $expr: baseEventExclusionFilterExpr,
              })
              .toArray();

            expect(updatedInstances).toHaveLength(10);

            expect(updatedInstances).toEqual(
              expect.arrayContaining(
                updatedInstances.map(() =>
                  expect.objectContaining({ title: updatedPayload!.title }),
                ),
              ),
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                // check that event has gcal attributes
                expect(event).toHaveProperty("gEventId");
                // check that event exist in gcal
                const gcalEvent = await EventDriver.getGCalEvent(
                  user,
                  updatedBase!.gEventId!,
                );

                expect(gcalEvent).toHaveProperty("recurrence");

                // check that the base event has been updated in gcal
                expect(gcalEvent).toEqual(
                  expect.objectContaining({
                    id: updatedBase!.gEventId,
                    summary: updatedPayload.title,
                  }),
                );

                // check that other instances were updated in gcal
                await Promise.all(
                  updatedInstances.map((instance) =>
                    expect(
                      EventDriver.getGCalEvent(user, instance.gEventId!),
                    ).resolves.toEqual(
                      expect.objectContaining({
                        id: instance.gEventId,
                        summary: updatedPayload!.title,
                      }),
                    ),
                  ),
                );
                break;
              }
            }
          });

          it("should update the description field of all events in the recurrence", async () => {
            const _user = await AuthDriver.googleSignup();
            const calendar = await CalendarDriver.getRandomUserCalendar(
              _user._id,
            );
            const isSomeday = false;
            const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
            const payload = createMockBaseEvent({
              isSomeday,
              user,
              recurrence,
            });

            const changes = await CompassSyncProcessor.processEvents([
              {
                payload: payload as ThisEventUpdate["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: EventStatus.CONFIRMED,
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

            // check that event is in db
            const event = await eventService.readById(user, payload._id);

            expect(event).toEqual(
              expect.objectContaining({
                ...payload,
                isSomeday: false,
                updatedAt: expect.any(Date),
                origin: CalendarProvider.COMPASS,
              }),
            );

            expect(event).toHaveProperty("recurrence");

            // expect event to have instances
            const instances = await mongoService.event
              .find({
                calendar,
                "recurrence.eventId": event._id,
                $expr: baseEventExclusionFilterExpr,
              })
              .toArray();

            expect(instances).toHaveLength(10); // recurrence rule count

            expect(instances).toEqual(
              expect.arrayContaining(
                instances.map(() =>
                  expect.objectContaining({
                    recurrence: { eventId: event._id },
                    isSomeday: false,
                    updatedAt: expect.any(Date),
                    origin: CalendarProvider.COMPASS,
                  }),
                ),
              ),
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                // check that event has gcal attributes
                expect(event).toHaveProperty("gEventId");

                instances.forEach((instance) => {
                  expect(instance).toHaveProperty("gEventId");
                  expect(instance).toHaveProperty("gRecurringEventId");
                });

                // check that event exist in gcal
                const gcalEvent = await EventDriver.getGCalEvent(
                  user,
                  event.gEventId!,
                );

                const gcalInstances = await Promise.all(
                  instances.map((instance) =>
                    EventDriver.getGCalEvent(user, instance.gEventId!),
                  ),
                );

                expect(gcalEvent).toHaveProperty("recurrence");

                expect(gcalEvent).toEqual(
                  expect.objectContaining({
                    id: event.gEventId,
                    recurrence: event.recurrence!.rule,
                  }),
                );

                expect(gcalInstances).toEqual(
                  expect.arrayContaining(
                    gcalInstances.map(() =>
                      expect.objectContaining({
                        recurringEventId: event!.gEventId,
                      }),
                    ),
                  ),
                );
                break;
              }
            }

            const instanceUpdate = instances[0]!;

            expect(instanceUpdate).toBeDefined();

            const updatedPayload = {
              ...instanceUpdate,
              _id: instanceUpdate._id.toString(),
              recurrence: {
                ...instanceUpdate.recurrence!,
                rule: event.recurrence!.rule,
              },
              description: faker.lorem.sentence(3),
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as AllEventsUpdate["payload"],
                applyTo: RecurringEventUpdateScope.ALL_EVENTS,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: ["RECURRENCE_BASE", "RECURRENCE_BASE_CONFIRMED"],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "RECURRENCE_BASE_UPDATED",
                },
              ]),
            );

            // check that event was updated in db
            const updatedBase = await mongoService.event.findOne({
              _id: new ObjectId(instanceUpdate.recurrence!.eventId),
              user,
            });

            expect(updatedBase).toBeDefined();

            expect(updatedBase).toEqual(
              expect.objectContaining({
                recurrence: { rule: event!.recurrence?.rule },
                description: updatedPayload.description,
                isSomeday: false,
                updatedAt: expect.any(Date),
                origin: CalendarProvider.COMPASS,
              }),
            );

            // check that other instances were not updated
            const updatedInstances = await mongoService.event
              .find({
                calendar,
                "recurrence.eventId": event._id,
                $expr: baseEventExclusionFilterExpr,
              })
              .toArray();

            expect(updatedInstances).toHaveLength(10);

            expect(updatedInstances).toEqual(
              expect.arrayContaining(
                updatedInstances.map(() =>
                  expect.objectContaining({
                    description: updatedPayload!.description,
                  }),
                ),
              ),
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                // check that event has gcal attributes
                expect(event).toHaveProperty("gEventId");
                // check that event exist in gcal
                const gcalEvent = await EventDriver.getGCalEvent(
                  user,
                  updatedBase!.gEventId!,
                );

                expect(gcalEvent).toHaveProperty("recurrence");

                // check that the base event has been updated in gcal
                expect(gcalEvent).toEqual(
                  expect.objectContaining({
                    id: updatedBase!.gEventId,
                    description: updatedPayload.description,
                  }),
                );

                // check that other instances were updated in gcal
                await Promise.all(
                  updatedInstances.map((instance) =>
                    expect(
                      EventDriver.getGCalEvent(user, instance.gEventId!),
                    ).resolves.toEqual(
                      expect.objectContaining({
                        id: instance.gEventId,
                        description: updatedPayload!.description,
                      }),
                    ),
                  ),
                );
                break;
              }
            }
          });

          it("should update the priority field of all events in the recurrence", async () => {
            const _user = await AuthDriver.googleSignup();
            const calendar = await CalendarDriver.getRandomUserCalendar(
              _user._id,
            );
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
                payload: payload as ThisEventUpdate["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: EventStatus.CONFIRMED,
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

            // check that event is in db
            const event = await eventService.readById(user, payload._id);

            expect(event).toEqual(
              expect.objectContaining({
                ...payload,
                isSomeday: false,
                updatedAt: expect.any(Date),
                origin: CalendarProvider.COMPASS,
              }),
            );

            expect(event).toHaveProperty("recurrence");

            // expect event to have instances
            const instances = await mongoService.event
              .find({
                calendar,
                "recurrence.eventId": event._id,
                $expr: baseEventExclusionFilterExpr,
              })
              .toArray();

            expect(instances).toHaveLength(10); // recurrence rule count

            expect(instances).toEqual(
              expect.arrayContaining(
                instances.map(() =>
                  expect.objectContaining({
                    priority: Priorities.SELF,
                    recurrence: { eventId: event._id },
                    isSomeday: false,
                    updatedAt: expect.any(Date),
                    origin: CalendarProvider.COMPASS,
                  }),
                ),
              ),
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                // check that event has gcal attributes
                expect(event).toHaveProperty("gEventId");

                instances.forEach((instance) => {
                  expect(instance).toHaveProperty("gEventId");
                  expect(instance).toHaveProperty("gRecurringEventId");
                });

                // check that event exist in gcal
                const gcalEvent = await EventDriver.getGCalEvent(
                  user,
                  event.gEventId!,
                );

                const gcalInstances = await Promise.all(
                  instances.map((instance) =>
                    EventDriver.getGCalEvent(user, instance.gEventId!),
                  ),
                );

                expect(gcalEvent).toHaveProperty("recurrence");

                expect(gcalEvent).toEqual(
                  expect.objectContaining({
                    id: event.gEventId,
                    recurrence: event.recurrence!.rule,
                    extendedProperties: expect.objectContaining({
                      private: expect.objectContaining({
                        priority: Priorities.SELF,
                      }),
                    }),
                  }),
                );

                expect(gcalInstances).toEqual(
                  expect.arrayContaining(
                    gcalInstances.map(() =>
                      expect.objectContaining({
                        recurringEventId: event!.gEventId,
                        extendedProperties: expect.objectContaining({
                          private: expect.objectContaining({
                            priority: Priorities.SELF,
                          }),
                        }),
                      }),
                    ),
                  ),
                );
                break;
              }
            }

            const instanceUpdate = instances[0]!;

            expect(instanceUpdate).toBeDefined();

            const updatedPayload = {
              ...instanceUpdate,
              _id: instanceUpdate._id.toString(),
              recurrence: {
                ...instanceUpdate.recurrence!,
                rule: event.recurrence!.rule,
              },
              priority: Priorities.RELATIONS,
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as AllEventsUpdate["payload"],
                applyTo: RecurringEventUpdateScope.ALL_EVENTS,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: ["RECURRENCE_BASE", "RECURRENCE_BASE_CONFIRMED"],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "RECURRENCE_BASE_UPDATED",
                },
              ]),
            );

            // check that event was updated in db
            const updatedBase = await mongoService.event.findOne({
              _id: new ObjectId(instanceUpdate.recurrence!.eventId),
              user,
            });

            expect(updatedBase).toBeDefined();

            expect(updatedBase).toEqual(
              expect.objectContaining({
                recurrence: { rule: event!.recurrence?.rule },
                priority: Priorities.RELATIONS,
                isSomeday: false,
                updatedAt: expect.any(Date),
                origin: CalendarProvider.COMPASS,
              }),
            );

            // check that other instances were not updated
            const updatedInstances = await mongoService.event
              .find({
                calendar,
                "recurrence.eventId": event._id,
                $expr: baseEventExclusionFilterExpr,
              })
              .toArray();

            expect(updatedInstances).toHaveLength(10);

            expect(updatedInstances).toEqual(
              expect.arrayContaining(
                updatedInstances.map(() =>
                  expect.objectContaining({ priority: Priorities.RELATIONS }),
                ),
              ),
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                // check that event has gcal attributes
                expect(event).toHaveProperty("gEventId");
                // check that event exist in gcal
                const gcalEvent = await EventDriver.getGCalEvent(
                  user,
                  updatedBase!.gEventId!,
                );

                expect(gcalEvent).toHaveProperty("recurrence");

                // check that the base event has been updated in gcal
                expect(gcalEvent).toEqual(
                  expect.objectContaining({
                    id: updatedBase!.gEventId,
                    extendedProperties: expect.objectContaining({
                      private: expect.objectContaining({
                        priority: Priorities.RELATIONS,
                      }),
                    }),
                  }),
                );

                // check that other instances were updated in gcal
                await Promise.all(
                  updatedInstances.map((instance) =>
                    expect(
                      EventDriver.getGCalEvent(user, instance.gEventId!),
                    ).resolves.toEqual(
                      expect.objectContaining({
                        id: instance.gEventId,
                        extendedProperties: expect.objectContaining({
                          private: expect.objectContaining({
                            priority: Priorities.RELATIONS,
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

          it("should not update the startDate field of all events in the recurrence", async () => {
            const _user = await AuthDriver.googleSignup();
            const calendar = await CalendarDriver.getRandomUserCalendar(
              _user._id,
            );
            const isSomeday = false;
            const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
            const payload = createMockBaseEvent({
              isSomeday,
              user,
              recurrence,
            });

            const changes = await CompassSyncProcessor.processEvents([
              {
                payload: payload as ThisEventUpdate["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: EventStatus.CONFIRMED,
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

            // check that event is in db
            const event = await eventService.readById(user, payload._id);

            expect(event).toEqual(
              expect.objectContaining({
                ...payload,
                isSomeday: false,
                updatedAt: expect.any(Date),
                origin: CalendarProvider.COMPASS,
              }),
            );

            expect(event).toHaveProperty("recurrence");

            // expect event to have instances
            const instances = await mongoService.event
              .find({
                calendar,
                "recurrence.eventId": event._id,
                $expr: baseEventExclusionFilterExpr,
              })
              .toArray();

            expect(instances).toHaveLength(10); // recurrence rule count

            expect(instances).toEqual(
              expect.arrayContaining(
                instances.map(() =>
                  expect.objectContaining({
                    recurrence: { eventId: event._id },
                    isSomeday: false,
                    updatedAt: expect.any(Date),
                    origin: CalendarProvider.COMPASS,
                  }),
                ),
              ),
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                // check that event has gcal attributes
                expect(event).toHaveProperty("gEventId");

                instances.forEach((instance) => {
                  expect(instance).toHaveProperty("gEventId");
                  expect(instance).toHaveProperty("gRecurringEventId");
                });

                // check that event exist in gcal
                const gcalEvent = await EventDriver.getGCalEvent(
                  user,
                  event.gEventId!,
                );

                const gcalInstances = await Promise.all(
                  instances.map((instance) =>
                    EventDriver.getGCalEvent(user, instance.gEventId!),
                  ),
                );

                expect(gcalEvent).toHaveProperty("recurrence");

                expect(gcalEvent).toEqual(
                  expect.objectContaining({
                    id: event.gEventId,
                    recurrence: event.recurrence!.rule,
                  }),
                );

                expect(gcalInstances).toEqual(
                  expect.arrayContaining(
                    gcalInstances.map(() =>
                      expect.objectContaining({
                        recurringEventId: event!.gEventId,
                      }),
                    ),
                  ),
                );
                break;
              }
            }

            const instanceUpdate = instances[0]!;

            expect(instanceUpdate).toBeDefined();

            const updatedPayload = {
              ...instanceUpdate,
              _id: instanceUpdate._id.toString(),
              recurrence: {
                ...instanceUpdate.recurrence!,
                rule: event.recurrence!.rule,
              },
              startDate: dayjs(event.endDate!).subtract(2, "hours").toDate(),
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                user: _user._id,
                payload: updatedPayload,
                applyTo: RecurringEventUpdateScope.ALL_EVENTS,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: ["RECURRENCE_BASE", "RECURRENCE_BASE_CONFIRMED"],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "RECURRENCE_BASE_UPDATED",
                },
              ]),
            );

            // check that event was updated in db
            const updatedBase = await mongoService.event.findOne({
              _id: new ObjectId(instanceUpdate.recurrence!.eventId),
              user,
            });

            expect(updatedBase).toBeDefined();

            expect(updatedBase).toEqual(
              expect.objectContaining({
                recurrence: { rule: event!.recurrence?.rule },
                startDate: expect.not.stringMatching(updatedPayload.startDate),
                isSomeday: false,
                updatedAt: expect.any(Date),
                origin: CalendarProvider.COMPASS,
              }),
            );

            // check that other instances were not updated
            const updatedInstances = await mongoService.event
              .find({
                calendar,
                "recurrence.eventId": event._id,
                $expr: baseEventExclusionFilterExpr,
              })
              .toArray();

            expect(updatedInstances).toHaveLength(10);

            expect(updatedInstances).toEqual(
              expect.arrayContaining(
                updatedInstances.map(() =>
                  expect.objectContaining({
                    startDate: expect.not.stringMatching(
                      updatedPayload.startDate,
                    ),
                  }),
                ),
              ),
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                // check that event has gcal attributes
                expect(event).toHaveProperty("gEventId");
                // check that event exist in gcal
                const gcalEvent = await EventDriver.getGCalEvent(
                  user,
                  updatedBase!.gEventId!,
                );

                expect(gcalEvent).toHaveProperty("recurrence");

                // check that the base event has been updated in gcal
                expect(gcalEvent).toEqual(
                  expect.objectContaining({
                    id: updatedBase!.gEventId,
                    start: expect.objectContaining({
                      dateTime: expect.not.stringMatching(
                        updatedPayload.startDate,
                      ),
                    }),
                  }),
                );

                // check that other instances were updated in gcal
                await Promise.all(
                  updatedInstances.map((instance) =>
                    expect(
                      EventDriver.getGCalEvent(user, instance.gEventId!),
                    ).resolves.toEqual(
                      expect.objectContaining({
                        id: instance.gEventId,
                        start: expect.objectContaining({
                          dateTime: expect.not.stringMatching(
                            updatedPayload.startDate,
                          ),
                        }),
                      }),
                    ),
                  ),
                );
                break;
              }
            }
          });

          it("should not update the endDate field of all events in the recurrence", async () => {
            const _user = await AuthDriver.googleSignup();
            const calendar = await CalendarDriver.getRandomUserCalendar(
              _user._id,
            );
            const isSomeday = false;
            const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
            const payload = createMockBaseEvent({
              isSomeday,
              user,
              recurrence,
            });

            const changes = await CompassSyncProcessor.processEvents([
              {
                payload: payload as ThisEventUpdate["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: EventStatus.CONFIRMED,
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

            // check that event is in db
            const event = await eventService.readById(user, payload._id);

            expect(event).toEqual(
              expect.objectContaining({
                ...payload,
                isSomeday: false,
                updatedAt: expect.any(Date),
                origin: CalendarProvider.COMPASS,
              }),
            );

            expect(event).toHaveProperty("recurrence");

            // expect event to have instances
            const instances = await mongoService.event
              .find({
                calendar,
                "recurrence.eventId": event._id,
                $expr: baseEventExclusionFilterExpr,
              })
              .toArray();

            expect(instances).toHaveLength(10); // recurrence rule count

            expect(instances).toEqual(
              expect.arrayContaining(
                instances.map(() =>
                  expect.objectContaining({
                    recurrence: { eventId: event._id },
                    isSomeday: false,
                    updatedAt: expect.any(Date),
                    origin: CalendarProvider.COMPASS,
                  }),
                ),
              ),
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                // check that event has gcal attributes
                expect(event).toHaveProperty("gEventId");

                instances.forEach((instance) => {
                  expect(instance).toHaveProperty("gEventId");
                  expect(instance).toHaveProperty("gRecurringEventId");
                });

                // check that event exist in gcal
                const gcalEvent = await EventDriver.getGCalEvent(
                  user,
                  event.gEventId!,
                );

                const gcalInstances = await Promise.all(
                  instances.map((instance) =>
                    EventDriver.getGCalEvent(user, instance.gEventId!),
                  ),
                );

                expect(gcalEvent).toHaveProperty("recurrence");

                expect(gcalEvent).toEqual(
                  expect.objectContaining({
                    id: event.gEventId,
                    recurrence: event.recurrence!.rule,
                  }),
                );

                expect(gcalInstances).toEqual(
                  expect.arrayContaining(
                    gcalInstances.map(() =>
                      expect.objectContaining({
                        recurringEventId: event!.gEventId,
                      }),
                    ),
                  ),
                );
                break;
              }
            }

            const instanceUpdate = instances[0]!;

            expect(instanceUpdate).toBeDefined();

            const updatedPayload = {
              ...instanceUpdate,
              _id: instanceUpdate._id.toString(),
              recurrence: {
                ...instanceUpdate.recurrence!,
                rule: event.recurrence!.rule,
              },
              endDate: dayjs(event.startDate!).add(2, "hours").toDate(),
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as AllEventsUpdate["payload"],
                applyTo: RecurringEventUpdateScope.ALL_EVENTS,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: ["RECURRENCE_BASE", "RECURRENCE_BASE_CONFIRMED"],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "RECURRENCE_BASE_UPDATED",
                },
              ]),
            );

            // check that event was updated in db
            const updatedBase = await mongoService.event.findOne({
              _id: new ObjectId(instanceUpdate.recurrence!.eventId),
              user,
            });

            expect(updatedBase).toBeDefined();

            expect(updatedBase).toEqual(
              expect.objectContaining({
                recurrence: { rule: event!.recurrence?.rule },
                endDate: expect.not.stringMatching(updatedPayload.endDate),
                isSomeday: false,
                updatedAt: expect.any(Date),
                origin: CalendarProvider.COMPASS,
              }),
            );

            // check that other instances were not updated
            const updatedInstances = await mongoService.event
              .find({
                user,
                "recurrence.eventId": event._id,
              })
              .toArray();

            expect(updatedInstances).toHaveLength(10);

            expect(updatedInstances).toEqual(
              expect.arrayContaining(
                updatedInstances.map(() =>
                  expect.objectContaining({
                    endDate: expect.not.stringMatching(updatedPayload.endDate),
                  }),
                ),
              ),
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                // check that event has gcal attributes
                expect(event).toHaveProperty("gEventId");
                // check that event exist in gcal
                const gcalEvent = await EventDriver.getGCalEvent(
                  user,
                  updatedBase!.gEventId!,
                );

                expect(gcalEvent).toHaveProperty("recurrence");

                // check that the base event has been updated in gcal
                expect(gcalEvent).toEqual(
                  expect.objectContaining({
                    id: updatedBase!.gEventId,
                    start: expect.objectContaining({
                      dateTime: expect.not.stringMatching(
                        updatedPayload.endDate,
                      ),
                    }),
                  }),
                );

                // check that other instances were updated in gcal
                await Promise.all(
                  updatedInstances.map((instance) =>
                    expect(
                      EventDriver.getGCalEvent(user, instance.gEventId!),
                    ).resolves.toEqual(
                      expect.objectContaining({
                        id: instance.gEventId,
                        start: expect.objectContaining({
                          dateTime: expect.not.stringMatching(
                            updatedPayload.endDate,
                          ),
                        }),
                      }),
                    ),
                  ),
                );
                break;
              }
            }
          });
        });

        describe("Transition Edits: ", () => {
          it("should update the isSomeday(to true) field of an event - instance base to base someday event", async () => {
            const _user = await AuthDriver.googleSignup();
            const calendar = await CalendarDriver.getRandomUserCalendar(
              _user._id,
            );
            const isSomeday = false;
            const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
            const payload = createMockBaseEvent({
              isSomeday,
              user,
              recurrence,
            });

            const changes = await CompassSyncProcessor.processEvents([
              {
                payload: payload as ThisEventUpdate["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: EventStatus.CONFIRMED,
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

            // check that event is in db
            const event = await eventService.readById(user, payload._id);

            expect(event).toEqual(
              expect.objectContaining({
                ...payload,
                isSomeday: false,
                updatedAt: expect.any(Date),
                origin: CalendarProvider.COMPASS,
              }),
            );

            expect(event).toHaveProperty("recurrence");

            // expect event to have instances
            const instances = await mongoService.event
              .find({
                calendar,
                "recurrence.eventId": event._id,
                $expr: baseEventExclusionFilterExpr,
              })
              .toArray();

            expect(instances).toHaveLength(10); // recurrence rule count

            expect(instances).toEqual(
              expect.arrayContaining(
                instances.map(() =>
                  expect.objectContaining({
                    recurrence: { eventId: event._id },
                    isSomeday: false,
                    updatedAt: expect.any(Date),
                    origin: CalendarProvider.COMPASS,
                  }),
                ),
              ),
            );

            const calendarProvider = CalendarProvider.GOOGLE;

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                // check that event has gcal attributes
                expect(event).toHaveProperty("gEventId");

                instances.forEach((instance) => {
                  expect(instance).toHaveProperty("gEventId");
                  expect(instance).toHaveProperty("gRecurringEventId");
                });

                // check that event exist in gcal
                const gcalEvent = await EventDriver.getGCalEvent(
                  user,
                  event.gEventId!,
                );

                const gcalInstances = await Promise.all(
                  instances.map((instance) =>
                    EventDriver.getGCalEvent(user, instance.gEventId!),
                  ),
                );

                expect(gcalEvent).toHaveProperty("recurrence");

                expect(gcalEvent).toEqual(
                  expect.objectContaining({
                    id: event.gEventId,
                    recurrence: event.recurrence!.rule,
                  }),
                );

                expect(gcalInstances).toEqual(
                  expect.arrayContaining(
                    gcalInstances.map(() =>
                      expect.objectContaining({
                        recurringEventId: event!.gEventId,
                      }),
                    ),
                  ),
                );
                break;
              }
            }

            const instanceUpdate = instances[0]!;

            expect(instanceUpdate).toBeDefined();

            const updatedPayload = {
              ...instanceUpdate,
              _id: instanceUpdate._id.toString(),
              recurrence: {
                ...instanceUpdate.recurrence!,
                rule: event.recurrence!.rule,
              },
              title: "Transitioned to Someday Event",
              isSomeday: true,
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as AllEventsUpdate["payload"],
                applyTo: RecurringEventUpdateScope.ALL_EVENTS,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: [
                    "RECURRENCE_BASE",
                    "RECURRENCE_BASE_SOMEDAY_CONFIRMED",
                  ],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "RECURRENCE_BASE_UPDATED",
                },
              ]),
            );

            const baseToSomedayEvent = await mongoService.event.findOne({
              user,
              title: updatedPayload.title,
              isSomeday: true,
            });

            expect(baseToSomedayEvent).toBeDefined();

            // same id kept across transition
            expect(baseToSomedayEvent!._id.toString()).toBe(
              updatedPayload.recurrence.eventId,
            );

            expect(baseToSomedayEvent).toEqual(
              expect.objectContaining({
                title: updatedPayload.title,
                priority: updatedPayload.priority,
                isAllDay: updatedPayload.isAllDay,
                recurrence: { rule: event!.recurrence!.rule },
                user: updatedPayload.user,
                isSomeday: true,
                updatedAt: expect.any(Date),
                origin: CalendarProvider.COMPASS,
              }),
            );

            expect(updatedPayload.recurrence.eventId).toBeDefined();

            // check that instances provider data were deleted
            const newInstances = await mongoService.event
              .find({
                calendar,
                "recurrence.eventId": updatedPayload.recurrence.eventId,
                $expr: baseEventExclusionFilterExpr,
              })
              .toArray();

            expect(newInstances).toHaveLength(10);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                // check that event has no gcal attributes
                expect(baseToSomedayEvent).not.toHaveProperty("gEventId");

                expect(baseToSomedayEvent).not.toHaveProperty(
                  "gRecurringEventId",
                );

                newInstances.forEach((instance) => {
                  expect.objectContaining({
                    recurrence: { eventId: event._id },
                    isSomeday: true,
                    updatedAt: expect.any(Date),
                    origin: CalendarProvider.COMPASS,
                  });

                  expect(instance).not.toHaveProperty("gEventId");
                  expect(instance).not.toHaveProperty("gRecurringEventId");
                });

                // check that the base event has been deleted in gcal
                await expect(
                  EventDriver.getGCalEvent(
                    user,
                    instanceUpdate!.gRecurringEventId!,
                  ),
                ).rejects.toThrow(
                  `Event with id ${instanceUpdate!.gRecurringEventId} not found`,
                );

                // check that other instances has been deleted in gcal
                await Promise.all(
                  newInstances.map((instance) =>
                    expect(
                      EventDriver.getGCalEvent(user, instance.gEventId!),
                    ).rejects.toThrow(
                      `Event with id ${instance.gEventId} not found`,
                    ),
                  ),
                );
                break;
              }
            }
          });

          it("should update the recurrence(rule) field of an event - to base calendar event", async () => {
            const _user = await AuthDriver.googleSignup();
            const calendar = await CalendarDriver.getRandomUserCalendar(
              _user._id,
            );

            const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
            const payload = createMockBaseEvent({
              recurrence,
              calendar: calendar._id,
            });

            const event: ThisEventUpdate = {
              payload,
              status,
              applyTo: RecurringEventUpdateScope.THIS_EVENT,
              calendar,
              providerSync: true,
            };

            const parser = new CompassEventParser(event);

            await parser.init();

            await parser.createEvent();

            const { baseEvent, instances } = await testCompassSeries(
              payload,
              10,
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassSeriesInGcal(baseEvent!, instances);
                break;
            }

            const instanceToUpdate = instances[0]!;

            expect(instanceToUpdate).toBeDefined();

            const updatedPayload = InstanceEventSchema.parse({
              ...instanceToUpdate,
              recurrence: {
                rule: ["RRULE:FREQ=DAILY;COUNT=5"],
                eventId: instanceToUpdate.recurrence!.eventId,
              },
            });

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload,
                providerSync: true,
                calendar,
                applyTo: RecurringEventUpdateScope.ALL_EVENTS,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: ["RECURRENCE_BASE", "RECURRENCE_BASE_CONFIRMED"],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "RECURRENCE_BASE_UPDATED",
                },
              ]),
            );

            const updatedBase = await mongoService.event.findOne({
              _id: new ObjectId(instanceToUpdate.recurrence!.eventId),
              user,
            });

            expect(updatedBase).toBeDefined();

            const { baseEvent: updatedBaseEvent, instances: updatedInstances } =
              await testCompassSeries(
                BaseEventSchema.parse({
                  ...updatedBase,
                  recurrence: { rule: updatedPayload.recurrence.rule },
                }),
                5,
              );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassSeriesInGcal(
                  updatedBaseEvent!,
                  updatedInstances,
                );
                break;
            }
          });

          it("should update the recurrence(rule to null) field of an event - change base to regular calendar event", async () => {
            const _user = await AuthDriver.googleSignup();
            const calendar = await CalendarDriver.getRandomUserCalendar(
              _user._id,
            );

            const isSomeday = false;
            const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
            const payload = createMockBaseEvent({
              isSomeday,
              calendar: calendar._id,
              recurrence,
            });

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
                  transition: [null, "RECURRENCE_BASE_CONFIRMED"],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "RECURRENCE_BASE_CREATED",
                },
              ]),
            );

            // check that event is in db
            const event = await eventService.readById(
              calendar._id,
              payload._id,
            );

            expect(event).toEqual(
              expect.objectContaining({
                ...payload,
                isSomeday: false,
                updatedAt: expect.any(Date),
                origin: CalendarProvider.COMPASS,
              }),
            );

            expect(event).toHaveProperty("recurrence");

            // expect event to have instances
            const instances = await mongoService.event
              .find({
                calendar: calendar._id,
                "recurrence.eventId": event._id,
                $expr: baseEventExclusionFilterExpr,
              })
              .toArray();

            expect(instances).toHaveLength(10); // recurrence rule count

            expect(instances).toEqual(
              expect.arrayContaining(
                instances.map(() =>
                  expect.objectContaining({
                    recurrence: { eventId: event._id },
                    isSomeday: false,
                    updatedAt: expect.any(Date),
                    origin: CalendarProvider.COMPASS,
                  }),
                ),
              ),
            );

            const calendarProvider = CalendarProvider.GOOGLE;

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                // check that event has gcal attributes
                expect(event).toHaveProperty("gEventId");

                instances.forEach((instance) => {
                  expect(instance).toHaveProperty("gEventId");
                  expect(instance).toHaveProperty("gRecurringEventId");
                });

                // check that event exist in gcal
                const gcalEvent = await EventDriver.getGCalEvent(
                  _user._id,
                  EventMetadataSchema.parse(event.metadata).id,
                  calendar.metadata.id,
                );

                const gcalInstances = await Promise.all(
                  instances.map((instance) =>
                    EventDriver.getGCalEvent(
                      _user._id,
                      EventMetadataSchema.parse(instance.metadata).id,
                      calendar.metadata.id,
                    ),
                  ),
                );

                expect(gcalEvent).toHaveProperty("recurrence");

                expect(gcalEvent).toEqual(
                  expect.objectContaining({
                    id: event.metadata?.id,
                    recurrence: event.recurrence?.rule,
                  }),
                );

                expect(gcalInstances).toEqual(
                  expect.arrayContaining(
                    gcalInstances.map(() =>
                      expect.objectContaining({
                        recurringEventId: event.metadata?.id,
                      }),
                    ),
                  ),
                );
                break;
              }
            }

            const instanceUpdate = instances[0]!;

            expect(instanceUpdate).toBeDefined();

            const updatedPayload = {
              ...instanceUpdate,
              recurrence: { ...instanceUpdate.recurrence!, rule: null },
              title: "Transitioned to Regular Event",
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as AllEventsUpdate["payload"],
                providerSync: true,
                calendar,
                applyTo: RecurringEventUpdateScope.ALL_EVENTS,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: ["RECURRENCE_BASE", "REGULAR_CONFIRMED"],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "RECURRENCE_BASE_UPDATED",
                },
              ]),
            );

            // check that event was transitioned to someday standalone in db
            // the original event should be deleted
            const deletedInstance = await mongoService.event.findOne({
              _id: instanceUpdate._id,
              calendar: calendar._id,
            });

            expect(deletedInstance).toBeNull();

            const baseToStandaloneEvent = await mongoService.event.findOne({
              calendar: calendar._id,
              title: updatedPayload.title,
              isSomeday: false,
            });

            expect(baseToStandaloneEvent).toBeDefined();

            expect(baseToStandaloneEvent).not.toHaveProperty("recurrence");

            expect(baseToStandaloneEvent).toEqual(
              expect.objectContaining({
                _id: (
                  updatedPayload.recurrence as unknown as Schema_Instance_Event["recurrence"]
                ).eventId,
                title: updatedPayload.title,
                priority: updatedPayload.priority,
                calendar: updatedPayload.calendar,
                isSomeday: false,
                updatedAt: expect.any(Date),
                origin: CalendarProvider.COMPASS,
              }),
            );

            // check that other instances were deleted
            const otherInstances = await mongoService.event
              .find({
                calendar: calendar._id,
                "recurrence.eventId": event._id,
              })
              .toArray();

            expect(otherInstances).toHaveLength(0);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                // check that event has gcal attributes
                expect(baseToStandaloneEvent?.metadata).toHaveProperty("id");

                // check that the base event has been updated in gcal
                const standaloneGcalEvent = await EventDriver.getGCalEvent(
                  _user._id,
                  EventMetadataSchema.parse(baseToStandaloneEvent?.metadata).id,
                  calendar.metadata.id,
                );

                expect(standaloneGcalEvent).not.toHaveProperty("recurrence");

                expect(standaloneGcalEvent).toEqual(
                  expect.objectContaining({
                    id: baseToStandaloneEvent?.metadata?.id,
                    summary: baseToStandaloneEvent!.title,
                  }),
                );

                // check that old event instances have been deleted in gcal
                await Promise.all(
                  instances.map((instance) =>
                    expect(
                      EventDriver.getGCalEvent(
                        _user._id,
                        InstanceEventMetadataSchema.parse(instance.metadata).id,
                        calendar.metadata.id,
                      ),
                    ).rejects.toThrow(
                      new Error(
                        `Event with id ${instance.metadata?.id} not found`,
                      ),
                    ),
                  ),
                );
                break;
              }
            }
          });
        });
      });
    });

    describe("Delete - Instance Event: ", () => {
      it("should delete a recurring event series", async () => {
        const _user = await AuthDriver.googleSignup();
        const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
        const status = EventStatus.CONFIRMED;
        const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
        const payload = createMockBaseEvent({ recurrence, user });
        const event = { payload, status } as EventUpdate;
        const parser = new CompassEventParser(event);

        await parser.init();

        await parser.createEvent();

        const { baseEvent, instances } = await testCompassSeries(payload, 10);

        switch (calendarProvider) {
          case CalendarProvider.GOOGLE:
            await testCompassSeriesInGcal(baseEvent!, instances);
            break;
        }

        const instanceToUpdate = instances[0]!;

        expect(instanceToUpdate).toBeDefined();

        const updatedPayload = {
          ...instanceToUpdate,
          recurrence: {
            rule: baseEvent!.recurrence!.rule,
            eventId: instanceToUpdate.recurrence!.eventId,
          },
          _id: instanceToUpdate._id.toString(),
        };

        const updateChanges = await CompassSyncProcessor.processEvents([
          {
            payload: updatedPayload as AllEventsUpdate["payload"],
            applyTo: RecurringEventUpdateScope.ALL_EVENTS,
            status: EventStatus.CANCELLED,
          },
        ]);

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
          mongoService.event.findOne({
            user: updatedPayload.user,
            _id: new ObjectId(updatedPayload._id),
          }),
        ).resolves.toBeNull();

        await expect(
          mongoService.event
            .find({
              calendar: payload.calendar,
              "recurrence.eventId": baseEvent._id,
            })
            .toArray(),
        ).resolves.toHaveLength(0);

        switch (calendarProvider) {
          case CalendarProvider.GOOGLE:
            await expect(
              EventDriver.getGCalEvent(
                updatedPayload.user!,
                updatedPayload.gEventId!,
              ),
            ).rejects.toThrow(
              `Event with id ${updatedPayload.gEventId} not found`,
            );

            await Promise.all(
              instances.map((instance) =>
                expect(
                  EventDriver.getGCalEvent(instance.user!, instance.gEventId!),
                ).rejects.toThrow(
                  `Event with id ${instance.gEventId} not found`,
                ),
              ),
            );

            break;
        }
      });
    });
  },
);
