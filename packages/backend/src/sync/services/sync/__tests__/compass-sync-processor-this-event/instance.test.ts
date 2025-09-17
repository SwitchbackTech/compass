import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";
import { Priorities } from "@core/constants/core.constants";
import {
  CalendarProvider,
  Categories_Recurrence,
  CompassEventStatus,
  CompassThisEvent,
  RecurringEventUpdateScope,
  Schema_Event,
} from "@core/types/event.types";
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
  testCompassInstanceEvent,
  testCompassSeries,
  testCompassSeriesInGcal,
} from "@backend/event/classes/compass.event.parser.test.util";
import eventService, { _getGcal } from "@backend/event/services/event.service";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";

describe.each([{ calendarProvider: CalendarProvider.GOOGLE }])(
  `CompassSyncProcessor - $calendarProvider calendar: ${RecurringEventUpdateScope.THIS_EVENT} - Instance Event: `,
  ({ calendarProvider }) => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    describe("Update - Instance Event: ", () => {
      describe("Calendar: ", () => {
        describe("Basic Edits: ", () => {
          it("should update the title field of an event", async () => {
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

            const { baseEvent, instances } = await testCompassSeries(
              payload,
              10,
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassSeriesInGcal(baseEvent!, instances);
                break;
            }

            const instanceUpdate = instances[0]!;

            expect(instanceUpdate).toBeDefined();

            const updatedPayload = {
              ...instanceUpdate,
              _id: instanceUpdate._id.toString(),
              recurrence: {
                ...instanceUpdate.recurrence!,
                rule: baseEvent.recurrence!.rule,
              },
              title: faker.lorem.sentence(3),
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as CompassThisEvent["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: CompassEventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: [
                    "RECURRENCE_INSTANCE",
                    "RECURRENCE_INSTANCE_CONFIRMED",
                  ],
                  category: Categories_Recurrence.RECURRENCE_INSTANCE,
                  operation: "RECURRENCE_INSTANCE_UPDATED",
                },
              ]),
            );

            delete (updatedPayload as Schema_Event).recurrence;

            // check that event was updated in db
            const { instanceEvent } =
              await testCompassInstanceEvent(updatedPayload);

            // check that other instances were not updated
            const otherInstances = await mongoService.event
              .find({
                user,
                "recurrence.eventId": baseEvent!._id.toString(),
                _id: { $ne: instanceEvent._id },
              })
              .toArray();

            expect(otherInstances).toHaveLength(9);

            otherInstances.forEach((instance) =>
              testCompassInstanceEvent({
                ...instance,
                _id: instance._id.toString(),
                title: payload.title,
                recurrence: { eventId: baseEvent!._id.toString() },
              }),
            );

            // check that the base event was not updated
            const _baseEvent = await eventService.readById(
              user,
              baseEvent!._id.toString(),
            );

            expect(_baseEvent).toEqual(
              expect.objectContaining({ title: payload!.title }),
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                await testCompassEventInGcal(instanceEvent);

                // check that the base event has not been updated in gcal
                await expect(
                  _getGcal(user, instanceEvent!.gRecurringEventId!),
                ).resolves.toEqual(
                  expect.objectContaining({
                    id: instanceEvent!.gRecurringEventId,
                    summary: payload!.title,
                  }),
                );

                // check that other instances were not updated in gcal
                await Promise.all(
                  otherInstances.map((instance) =>
                    expect(_getGcal(user, instance.gEventId!)).resolves.toEqual(
                      expect.objectContaining({
                        id: instance.gEventId,
                        summary: payload!.title,
                      }),
                    ),
                  ),
                );
                break;
              }
            }
          });

          it("should update the description field of an event", async () => {
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
                payload: updatedPayload as CompassThisEvent["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: CompassEventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: [
                    "RECURRENCE_INSTANCE",
                    "RECURRENCE_INSTANCE_CONFIRMED",
                  ],
                  category: Categories_Recurrence.RECURRENCE_INSTANCE,
                  operation: "RECURRENCE_INSTANCE_UPDATED",
                },
              ]),
            );

            // check that event was updated in db
            const updatedInstance = await mongoService.event.findOne({
              _id: instanceUpdate._id,
              user,
            });

            expect(updatedInstance).toBeDefined();

            expect(updatedInstance).toEqual(
              expect.objectContaining({
                ...updatedPayload,
                _id: instanceUpdate._id,
                recurrence: { eventId: event!._id.toString() },
                description: updatedPayload.description,
                isSomeday: false,
                updatedAt: expect.any(Date),
                origin: CalendarProvider.COMPASS,
              }),
            );

            // check that other instances were not updated
            const otherInstances = await mongoService.event
              .find({
                user,
                "recurrence.eventId": event!._id.toString(),
                _id: { $ne: instanceUpdate._id },
              })
              .toArray();

            expect(otherInstances).toHaveLength(9);

            expect(otherInstances).toEqual(
              expect.arrayContaining(
                otherInstances.map(() =>
                  expect.objectContaining({ description: event!.description }),
                ),
              ),
            );

            // check that the base event was not updated
            const baseEvent = await eventService.readById(
              user,
              event!._id.toString(),
            );

            expect(baseEvent).toEqual(
              expect.objectContaining({ description: event!.description }),
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                // check that event has gcal attributes
                expect(event).toHaveProperty("gEventId");
                // check that event exist in gcal
                const gcalEvent = await _getGcal(
                  user,
                  updatedInstance!.gEventId!,
                );

                expect(gcalEvent).not.toHaveProperty("recurrence");

                expect(gcalEvent).toEqual(
                  expect.objectContaining({
                    id: updatedInstance!.gEventId,
                    description: updatedPayload.description,
                  }),
                );

                // check that the base event has not been updated in gcal
                await expect(
                  _getGcal(user, updatedInstance!.gRecurringEventId!),
                ).resolves.toEqual(
                  expect.objectContaining({
                    id: updatedInstance!.gRecurringEventId,
                    description: event!.description,
                  }),
                );

                // check that other instances were not updated in gcal
                await Promise.all(
                  otherInstances.map((instance) =>
                    expect(_getGcal(user, instance.gEventId!)).resolves.toEqual(
                      expect.objectContaining({
                        id: instance.gEventId,
                        description: event!.description,
                      }),
                    ),
                  ),
                );
                break;
              }
            }
          });

          it("should update the priority field of an event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const isSomeday = false;
            const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };

            const payload = createMockBaseEvent({
              isSomeday,
              user,
              recurrence,
              priority: Priorities.RELATIONS,
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
              priority: Priorities.WORK,
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as CompassThisEvent["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: CompassEventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: [
                    "RECURRENCE_INSTANCE",
                    "RECURRENCE_INSTANCE_CONFIRMED",
                  ],
                  category: Categories_Recurrence.RECURRENCE_INSTANCE,
                  operation: "RECURRENCE_INSTANCE_UPDATED",
                },
              ]),
            );

            // check that event was updated in db
            const updatedInstance = await mongoService.event.findOne({
              _id: instanceUpdate._id,
              user,
            });

            expect(updatedInstance).toBeDefined();

            expect(updatedInstance).toEqual(
              expect.objectContaining({
                ...updatedPayload,
                _id: instanceUpdate._id,
                recurrence: { eventId: event!._id.toString() },
                priority: updatedPayload.priority,
                isSomeday: false,
                updatedAt: expect.any(Date),
                origin: CalendarProvider.COMPASS,
              }),
            );

            // check that other instances were not updated
            const otherInstances = await mongoService.event
              .find({
                user,
                "recurrence.eventId": event!._id.toString(),
                _id: { $ne: instanceUpdate._id },
              })
              .toArray();

            expect(otherInstances).toHaveLength(9);

            expect(otherInstances).toEqual(
              expect.arrayContaining(
                otherInstances.map(() =>
                  expect.objectContaining({ priority: event!.priority }),
                ),
              ),
            );

            // check that the base event was not updated
            const baseEvent = await eventService.readById(
              user,
              event!._id.toString(),
            );

            expect(baseEvent).toEqual(
              expect.objectContaining({ priority: event!.priority }),
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                // check that event has gcal attributes
                expect(event).toHaveProperty("gEventId");
                // check that event exist in gcal
                const gcalEvent = await _getGcal(
                  user,
                  updatedInstance!.gEventId!,
                );

                expect(gcalEvent).not.toHaveProperty("recurrence");

                expect(gcalEvent).toEqual(
                  expect.objectContaining({
                    id: updatedInstance!.gEventId,
                    extendedProperties: expect.objectContaining({
                      private: expect.objectContaining({
                        priority: Priorities.WORK,
                      }),
                    }),
                  }),
                );

                // check that the base event has not been updated in gcal
                await expect(
                  _getGcal(user, updatedInstance!.gRecurringEventId!),
                ).resolves.toEqual(
                  expect.objectContaining({
                    id: updatedInstance!.gRecurringEventId,
                    extendedProperties: expect.objectContaining({
                      private: expect.objectContaining({
                        priority: Priorities.RELATIONS,
                      }),
                    }),
                  }),
                );

                // check that other instances were not updated in gcal
                await Promise.all(
                  otherInstances.map((instance) =>
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

          it("should update the startDate field of an event", async () => {
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
                payload: updatedPayload as CompassThisEvent["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: CompassEventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: [
                    "RECURRENCE_INSTANCE",
                    "RECURRENCE_INSTANCE_CONFIRMED",
                  ],
                  category: Categories_Recurrence.RECURRENCE_INSTANCE,
                  operation: "RECURRENCE_INSTANCE_UPDATED",
                },
              ]),
            );

            // check that event was updated in db
            const updatedInstance = await mongoService.event.findOne({
              _id: instanceUpdate._id,
              user,
            });

            expect(updatedInstance).toBeDefined();

            expect(updatedInstance).toEqual(
              expect.objectContaining({
                ...updatedPayload,
                _id: instanceUpdate._id,
                recurrence: { eventId: event!._id.toString() },
                startDate: updatedPayload.startDate,
                isSomeday: false,
                updatedAt: expect.any(Date),
                origin: CalendarProvider.COMPASS,
              }),
            );

            // check that other instances were not updated
            const otherInstances = await mongoService.event
              .find({
                user,
                "recurrence.eventId": event!._id.toString(),
                _id: { $ne: instanceUpdate._id },
              })
              .toArray();

            expect(otherInstances).toHaveLength(9);

            expect(otherInstances).toEqual(
              expect.arrayContaining(
                otherInstances.map(() =>
                  expect.not.objectContaining({ startDate: event!.startDate }),
                ),
              ),
            );

            // check that the base event was not updated
            const baseEvent = await eventService.readById(
              user,
              event!._id.toString(),
            );

            expect(baseEvent).toEqual(
              expect.objectContaining({ startDate: event!.startDate }),
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                // check that event has gcal attributes
                expect(event).toHaveProperty("gEventId");
                // check that event exist in gcal
                const gcalEvent = await _getGcal(
                  user,
                  updatedInstance!.gEventId!,
                );

                expect(gcalEvent).not.toHaveProperty("recurrence");

                expect(gcalEvent).toEqual(
                  expect.objectContaining({
                    id: updatedInstance!.gEventId,
                    start: expect.objectContaining({
                      dateTime: updatedPayload.startDate,
                    }),
                  }),
                );

                // check that the base event has not been updated in gcal
                await expect(
                  _getGcal(user, updatedInstance!.gRecurringEventId!),
                ).resolves.toEqual(
                  expect.objectContaining({
                    id: updatedInstance!.gRecurringEventId,
                    start: expect.objectContaining({
                      dateTime: event.startDate,
                    }),
                  }),
                );

                // check that other instances were not updated in gcal
                await Promise.all(
                  otherInstances.map((instance) =>
                    expect(_getGcal(user, instance.gEventId!)).resolves.toEqual(
                      expect.objectContaining({
                        id: instance.gEventId,
                        start: expect.not.objectContaining({
                          dateTime: updatedPayload.startDate,
                        }),
                      }),
                    ),
                  ),
                );
                break;
              }
            }
          });

          it("should update the endDate field of an event", async () => {
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
                payload: updatedPayload as CompassThisEvent["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: CompassEventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: [
                    "RECURRENCE_INSTANCE",
                    "RECURRENCE_INSTANCE_CONFIRMED",
                  ],
                  category: Categories_Recurrence.RECURRENCE_INSTANCE,
                  operation: "RECURRENCE_INSTANCE_UPDATED",
                },
              ]),
            );

            // check that event was updated in db
            const updatedInstance = await mongoService.event.findOne({
              _id: instanceUpdate._id,
              user,
            });

            expect(updatedInstance).toBeDefined();

            expect(updatedInstance).toEqual(
              expect.objectContaining({
                ...updatedPayload,
                _id: instanceUpdate._id,
                recurrence: { eventId: event!._id.toString() },
                endDate: updatedPayload.endDate,
                isSomeday: false,
                updatedAt: expect.any(Date),
                origin: CalendarProvider.COMPASS,
              }),
            );

            // check that other instances were not updated
            const otherInstances = await mongoService.event
              .find({
                user,
                "recurrence.eventId": event!._id.toString(),
                _id: { $ne: instanceUpdate._id },
              })
              .toArray();

            expect(otherInstances).toHaveLength(9);

            expect(otherInstances).toEqual(
              expect.arrayContaining(
                otherInstances.map(() =>
                  expect.not.objectContaining({ endDate: event!.endDate }),
                ),
              ),
            );

            // check that the base event was not updated
            const baseEvent = await eventService.readById(
              user,
              event!._id.toString(),
            );

            expect(baseEvent).toEqual(
              expect.objectContaining({ endDate: event!.endDate }),
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                // check that event has gcal attributes
                expect(event).toHaveProperty("gEventId");
                // check that event exist in gcal
                const gcalEvent = await _getGcal(
                  user,
                  updatedInstance!.gEventId!,
                );

                expect(gcalEvent).not.toHaveProperty("recurrence");

                expect(gcalEvent).toEqual(
                  expect.objectContaining({
                    id: updatedInstance!.gEventId,
                    end: expect.objectContaining({
                      dateTime: updatedPayload.endDate,
                    }),
                  }),
                );

                // check that the base event has not been updated in gcal
                await expect(
                  _getGcal(user, updatedInstance!.gRecurringEventId!),
                ).resolves.toEqual(
                  expect.objectContaining({
                    id: updatedInstance!.gRecurringEventId,
                    end: expect.objectContaining({
                      dateTime: event.endDate,
                    }),
                  }),
                );

                // check that other instances were not updated in gcal
                await Promise.all(
                  otherInstances.map((instance) =>
                    expect(_getGcal(user, instance.gEventId!)).resolves.toEqual(
                      expect.objectContaining({
                        id: instance.gEventId,
                        end: expect.not.objectContaining({
                          dateTime: updatedPayload.endDate,
                        }),
                      }),
                    ),
                  ),
                );
                break;
              }
            }
          });

          it("should not update the recurrence(change to new recurrence) field of event", async () => {
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
                rule: ["RRULE:FREQ=DAILY;COUNT=5"],
              },
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as CompassThisEvent["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: CompassEventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: [
                    "RECURRENCE_INSTANCE",
                    "RECURRENCE_INSTANCE_CONFIRMED",
                  ],
                  category: Categories_Recurrence.RECURRENCE_INSTANCE,
                  operation: "RECURRENCE_INSTANCE_UPDATED",
                },
              ]),
            );

            // check that event was updated in db
            const updatedInstance = await mongoService.event.findOne({
              _id: instanceUpdate._id,
              user,
            });

            expect(updatedInstance).toBeDefined();

            expect(updatedInstance).toEqual(
              expect.objectContaining({
                ...updatedPayload,
                _id: instanceUpdate._id,
                recurrence: { eventId: event!._id.toString() },
                endDate: updatedPayload.endDate,
                isSomeday: false,
                updatedAt: expect.any(Date),
                origin: CalendarProvider.COMPASS,
              }),
            );

            // check that other instances were not updated
            const otherInstances = await mongoService.event
              .find({
                user,
                "recurrence.eventId": event!._id.toString(),
                _id: { $ne: instanceUpdate._id },
              })
              .toArray();

            expect(otherInstances).toHaveLength(9);

            // check that the base event was not updated
            const baseEvent = await eventService.readById(
              user,
              event!._id.toString(),
            );

            expect(baseEvent).toEqual(
              expect.objectContaining({ recurrence: event!.recurrence }),
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                // check that event has gcal attributes
                expect(event).toHaveProperty("gEventId");
                // check that event exist in gcal
                const gcalEvent = await _getGcal(
                  user,
                  updatedInstance!.gEventId!,
                );

                expect(gcalEvent).not.toHaveProperty("recurrence");

                // check that the base event recurrence has not been updated in gcal
                await expect(
                  _getGcal(user, updatedInstance!.gRecurringEventId!),
                ).resolves.toEqual(
                  expect.objectContaining({
                    id: updatedInstance!.gRecurringEventId,
                    recurrence: event!.recurrence!.rule,
                  }),
                );

                // check that other instances still exists in gcal
                await Promise.all(
                  otherInstances.map((instance) =>
                    expect(_getGcal(user, instance.gEventId!)).resolves.toEqual(
                      expect.objectContaining({ id: instance.gEventId }),
                    ),
                  ),
                );
                break;
              }
            }
          });
        });

        describe("Transition Edits: ", () => {
          it("should update the isSomeday(to true) field of an event - instance base to regular someday event", async () => {
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
              title: "Transitioned to Someday Event",
              isSomeday: true,
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as CompassThisEvent["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: CompassEventStatus.CONFIRMED,
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

            // new id, gcal will delete the old event, so we create a new one
            expect(baseToSomedayEvent!._id.toString()).not.toBe(
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

            // check that other instances were deleted
            const oldInstances = await mongoService.event
              .find({
                user,
                "recurrence.eventId": updatedPayload.recurrence.eventId,
              })
              .toArray();

            expect(oldInstances).toHaveLength(0);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                // check that event has gcal attributes
                expect(baseToSomedayEvent).not.toHaveProperty("gEventId");

                expect(baseToSomedayEvent).not.toHaveProperty(
                  "gRecurringEventId",
                );

                // check that the base event has been deleted in gcal
                await expect(
                  _getGcal(user, instanceUpdate!.gRecurringEventId!),
                ).rejects.toThrow(
                  `Event with id ${instanceUpdate!.gRecurringEventId} not found`,
                );

                // check that other instances has been deleted in gcal
                await Promise.all(
                  oldInstances.map((instance) =>
                    expect(_getGcal(user, instance.gEventId!)).rejects.toThrow(
                      `Event with id ${instance.gEventId} not found`,
                    ),
                  ),
                );
                break;
              }
            }
          });

          it("should update the recurrence(rule to null) field of an event - change base to regular calendar event", async () => {
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
              recurrence: { ...instanceUpdate.recurrence!, rule: null },
              title: "Transitioned to Regular Event",
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as CompassThisEvent["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: CompassEventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: ["RECURRENCE_BASE", "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.RECURRENCE_BASE,
                  operation: "RECURRENCE_BASE_UPDATED",
                },
              ]),
            );

            // check that event was transitioned to someday standalone in db
            // the original event should be deleted
            const deletedInstance = await mongoService.event.findOne({
              _id: instanceUpdate._id,
              user,
            });

            expect(deletedInstance).toBeNull();

            const baseToStandaloneEvent = await mongoService.event.findOne({
              user,
              title: updatedPayload.title,
              isSomeday: false,
            });

            expect(baseToStandaloneEvent).toBeDefined();

            expect(baseToStandaloneEvent).not.toHaveProperty("recurrence");

            expect(baseToStandaloneEvent).toEqual(
              expect.objectContaining({
                _id: new ObjectId(updatedPayload!.recurrence!.eventId),
                title: updatedPayload.title,
                priority: updatedPayload.priority,
                isAllDay: updatedPayload.isAllDay,
                user: updatedPayload.user,
                isSomeday: false,
                updatedAt: expect.any(Date),
                origin: CalendarProvider.COMPASS,
              }),
            );

            // check that other instances were deleted
            const otherInstances = await mongoService.event
              .find({
                user,
                "recurrence.eventId": event!._id.toString(),
              })
              .toArray();

            expect(otherInstances).toHaveLength(0);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                // check that event has gcal attributes
                expect(baseToStandaloneEvent).toHaveProperty("gEventId");

                // check that the base event has been updated in gcal
                const standaloneGcalEvent = await _getGcal(
                  user,
                  baseToStandaloneEvent!.gEventId!,
                );

                expect(standaloneGcalEvent).not.toHaveProperty("recurrence");

                expect(standaloneGcalEvent).toEqual(
                  expect.objectContaining({
                    id: baseToStandaloneEvent!.gEventId,
                    summary: baseToStandaloneEvent!.title,
                  }),
                );

                // check that old event instances have been deleted in gcal
                await Promise.all(
                  instances.map((instance) =>
                    expect(_getGcal(user, instance.gEventId!)).rejects.toThrow(
                      new Error(`Event with id ${instance.gEventId} not found`),
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
      it("should delete a calendar event", async () => {
        const { user: _user } = await UtilDriver.setupTestUser();
        const user = _user._id.toString();
        const isSomeday = false;
        const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
        const payload = createMockBaseEvent({ isSomeday, user, recurrence });

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
            const gcalEvent = await _getGcal(user, event.gEventId!);

            const gcalInstances = await Promise.all(
              instances.map((instance) => _getGcal(user, instance.gEventId!)),
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

        const deletedInstance = instances[0]!;

        expect(deletedInstance).toBeDefined();

        const deletedInstanceId = deletedInstance._id.toString();

        const deleteChanges = await CompassSyncProcessor.processEvents([
          {
            payload: {
              ...deletedInstance,
              _id: deletedInstanceId,
              recurrence: {
                ...deletedInstance.recurrence,
                rule: event!.recurrence!.rule!,
              },
            } as CompassThisEvent["payload"],
            applyTo: RecurringEventUpdateScope.THIS_EVENT,
            status: CompassEventStatus.CANCELLED,
          },
        ]);

        expect(deleteChanges).toEqual(
          expect.arrayContaining([
            {
              title: payload.title,
              transition: [
                "RECURRENCE_INSTANCE",
                "RECURRENCE_INSTANCE_CANCELLED",
              ],
              category: Categories_Recurrence.RECURRENCE_INSTANCE,
              operation: "RECURRENCE_INSTANCE_DELETED",
            },
          ]),
        );

        // check that event is deleted in db
        await expect(
          eventService.readById(user, deletedInstanceId),
        ).rejects.toThrow();

        // check that other instances still exist
        const otherInstances = await mongoService.event
          .find({ user, "recurrence.eventId": event!._id.toString() })
          .toArray();

        expect(otherInstances).toHaveLength(9); // 10 - 1 deleted

        // check that the base event still exist
        const baseEvent = await eventService.readById(
          user,
          event!._id.toString(),
        );

        expect(baseEvent).toBeDefined();

        switch (calendarProvider) {
          case CalendarProvider.GOOGLE:
            // check that event has been deleted in gcal
            await expect(
              _getGcal(user, deletedInstance.gEventId!),
            ).rejects.toThrow(
              new Error(`Event with id ${deletedInstance.gEventId} not found`),
            );

            // check that the base event has not been deleted in gcal
            await expect(
              _getGcal(user, deletedInstance.gRecurringEventId!),
            ).resolves.toEqual(
              expect.objectContaining({
                id: deletedInstance.gRecurringEventId,
              }),
            );

            // check that other instances still exist in gcal
            await Promise.all(
              otherInstances.map((instance) =>
                expect(_getGcal(user, instance.gEventId!)).resolves.toEqual(
                  expect.objectContaining({
                    id: instance.gEventId,
                  }),
                ),
              ),
            );
            break;
        }
      });
    });
  },
);
