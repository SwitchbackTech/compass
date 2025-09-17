import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";
import { Priorities } from "@core/constants/core.constants";
import {
  CalendarProvider,
  Categories_Recurrence,
  CompassAllEvents,
  CompassEvent,
  CompassEventStatus,
  CompassThisEvent,
  RecurringEventUpdateScope,
} from "@core/types/event.types";
import { parseCompassEventDate } from "@core/util/event/event.util";
import { createMockBaseEvent } from "@core/util/test/ccal.event.factory";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
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
import eventService, { _getGcal } from "@backend/event/services/event.service";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";

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
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const isSomeday = false;
            const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
            const payload = createMockBaseEvent({
              isSomeday,
              user,
              recurrence,
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
              .find({ user, "recurrence.eventId": event!._id.toString() })
              .toArray();

            expect(instances).toHaveLength(10); // recurrence rule count

            expect(instances).toEqual(
              expect.arrayContaining(
                instances.map(() =>
                  expect.objectContaining({
                    recurrence: { eventId: event!._id.toString() },
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
                const gcalEvent = await _getGcal(user, event.gEventId!);

                const gcalInstances = await Promise.all(
                  instances.map((instance) =>
                    _getGcal(user, instance.gEventId!),
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
                payload: updatedPayload as CompassAllEvents["payload"],
                applyTo: RecurringEventUpdateScope.ALL_EVENTS,
                status: CompassEventStatus.CONFIRMED,
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
                user,
                "recurrence.eventId": event!._id.toString(),
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
                const gcalEvent = await _getGcal(user, updatedBase!.gEventId!);

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
                    expect(_getGcal(user, instance.gEventId!)).resolves.toEqual(
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
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const isSomeday = false;
            const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
            const payload = createMockBaseEvent({
              isSomeday,
              user,
              recurrence,
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
              .find({ user, "recurrence.eventId": event!._id.toString() })
              .toArray();

            expect(instances).toHaveLength(10); // recurrence rule count

            expect(instances).toEqual(
              expect.arrayContaining(
                instances.map(() =>
                  expect.objectContaining({
                    recurrence: { eventId: event!._id.toString() },
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
                const gcalEvent = await _getGcal(user, event.gEventId!);

                const gcalInstances = await Promise.all(
                  instances.map((instance) =>
                    _getGcal(user, instance.gEventId!),
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
                payload: updatedPayload as CompassAllEvents["payload"],
                applyTo: RecurringEventUpdateScope.ALL_EVENTS,
                status: CompassEventStatus.CONFIRMED,
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
                user,
                "recurrence.eventId": event!._id.toString(),
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
                const gcalEvent = await _getGcal(user, updatedBase!.gEventId!);

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
                    expect(_getGcal(user, instance.gEventId!)).resolves.toEqual(
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
              .find({ user, "recurrence.eventId": event!._id.toString() })
              .toArray();

            expect(instances).toHaveLength(10); // recurrence rule count

            expect(instances).toEqual(
              expect.arrayContaining(
                instances.map(() =>
                  expect.objectContaining({
                    priority: Priorities.SELF,
                    recurrence: { eventId: event!._id.toString() },
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
                const gcalEvent = await _getGcal(user, event.gEventId!);

                const gcalInstances = await Promise.all(
                  instances.map((instance) =>
                    _getGcal(user, instance.gEventId!),
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
                payload: updatedPayload as CompassAllEvents["payload"],
                applyTo: RecurringEventUpdateScope.ALL_EVENTS,
                status: CompassEventStatus.CONFIRMED,
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
                user,
                "recurrence.eventId": event!._id.toString(),
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
                const gcalEvent = await _getGcal(user, updatedBase!.gEventId!);

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
                    expect(_getGcal(user, instance.gEventId!)).resolves.toEqual(
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
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const isSomeday = false;
            const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
            const payload = createMockBaseEvent({
              isSomeday,
              user,
              recurrence,
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
              .find({ user, "recurrence.eventId": event!._id.toString() })
              .toArray();

            expect(instances).toHaveLength(10); // recurrence rule count

            expect(instances).toEqual(
              expect.arrayContaining(
                instances.map(() =>
                  expect.objectContaining({
                    recurrence: { eventId: event!._id.toString() },
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
                const gcalEvent = await _getGcal(user, event.gEventId!);

                const gcalInstances = await Promise.all(
                  instances.map((instance) =>
                    _getGcal(user, instance.gEventId!),
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
              startDate: parseCompassEventDate(event.endDate!)
                .subtract(2, "hours")
                .toISOString(),
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as CompassAllEvents["payload"],
                applyTo: RecurringEventUpdateScope.ALL_EVENTS,
                status: CompassEventStatus.CONFIRMED,
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
                user,
                "recurrence.eventId": event!._id.toString(),
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
                const gcalEvent = await _getGcal(user, updatedBase!.gEventId!);

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
                    expect(_getGcal(user, instance.gEventId!)).resolves.toEqual(
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
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const isSomeday = false;
            const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
            const payload = createMockBaseEvent({
              isSomeday,
              user,
              recurrence,
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
              .find({ user, "recurrence.eventId": event!._id.toString() })
              .toArray();

            expect(instances).toHaveLength(10); // recurrence rule count

            expect(instances).toEqual(
              expect.arrayContaining(
                instances.map(() =>
                  expect.objectContaining({
                    recurrence: { eventId: event!._id.toString() },
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
                const gcalEvent = await _getGcal(user, event.gEventId!);

                const gcalInstances = await Promise.all(
                  instances.map((instance) =>
                    _getGcal(user, instance.gEventId!),
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
              endDate: parseCompassEventDate(event.startDate!)
                .add(2, "hours")
                .toISOString(),
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as CompassAllEvents["payload"],
                applyTo: RecurringEventUpdateScope.ALL_EVENTS,
                status: CompassEventStatus.CONFIRMED,
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
                "recurrence.eventId": event!._id.toString(),
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
                const gcalEvent = await _getGcal(user, updatedBase!.gEventId!);

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
                    expect(_getGcal(user, instance.gEventId!)).resolves.toEqual(
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

          it("should not update the isSomeday(to true) field of an event - to regular someday event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const isSomeday = false;
            const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
            const payload = createMockBaseEvent({
              isSomeday,
              user,
              recurrence,
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
              .find({ user, "recurrence.eventId": event!._id.toString() })
              .toArray();

            expect(instances).toHaveLength(10); // recurrence rule count

            expect(instances).toEqual(
              expect.arrayContaining(
                instances.map(() =>
                  expect.objectContaining({
                    recurrence: { eventId: event!._id.toString() },
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
                const gcalEvent = await _getGcal(user, event.gEventId!);

                const gcalInstances = await Promise.all(
                  instances.map((instance) =>
                    _getGcal(user, instance.gEventId!),
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
              isSomeday: true,
            };

            const updateChanges = CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as CompassAllEvents["payload"],
                applyTo: RecurringEventUpdateScope.ALL_EVENTS,
                status: CompassEventStatus.CONFIRMED,
              },
            ]);

            await expect(updateChanges).rejects.toThrow();
          });
        });

        describe("Transition Edits: ", () => {
          it("should update the recurrence(rule) field of an event - to base calendar event", async () => {
            const _user = await UserDriver.createUser();
            const user = _user._id.toString();
            const status = CompassEventStatus.CONFIRMED;
            const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
            const payload = createMockBaseEvent({ recurrence, user });
            const event = { payload, status } as CompassEvent;
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

            const updatedPayload = {
              ...instanceToUpdate,
              _id: instanceToUpdate._id.toString(),
              recurrence: {
                rule: ["RRULE:FREQ=DAILY;COUNT=5"],
                eventId: instanceToUpdate.recurrence!.eventId,
              },
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as CompassAllEvents["payload"],
                applyTo: RecurringEventUpdateScope.ALL_EVENTS,
                status: CompassEventStatus.CONFIRMED,
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
                {
                  ...updatedBase,
                  _id: updatedBase!._id.toString(),
                  recurrence: { rule: updatedPayload.recurrence.rule },
                },
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
        });
      });
    });

    describe("Delete - Instance Event: ", () => {
      it("should delete a recurring event series", async () => {
        const _user = await UserDriver.createUser();
        const user = _user._id.toString();
        const status = CompassEventStatus.CONFIRMED;
        const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
        const payload = createMockBaseEvent({ recurrence, user });
        const event = { payload, status } as CompassEvent;
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
            payload: updatedPayload as CompassAllEvents["payload"],
            applyTo: RecurringEventUpdateScope.ALL_EVENTS,
            status: CompassEventStatus.CANCELLED,
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
              user: payload.user,
              "recurrence.eventId": baseEvent!._id.toString(),
            })
            .toArray(),
        ).resolves.toHaveLength(0);

        switch (calendarProvider) {
          case CalendarProvider.GOOGLE:
            await expect(
              _getGcal(updatedPayload.user!, updatedPayload.gEventId!),
            ).rejects.toThrow(
              `Event with id ${updatedPayload.gEventId} not found`,
            );

            await Promise.all(
              instances.map((instance) =>
                expect(
                  _getGcal(instance.user!, instance.gEventId!),
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
