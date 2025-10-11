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
import { GenericError } from "@backend/common/errors/generic/generic.errors";
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

          it("should not update the recurrence field of an instance event", async () => {
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
            const updatedInstance = await eventService.readById(
              user,
              instanceUpdate._id.toString(),
            );

            expect(updatedInstance).toBeDefined();

            expect(updatedInstance).toEqual(
              expect.objectContaining({
                ...updatedPayload,
                _id: instanceUpdate._id.toString(),
                recurrence: expect.objectContaining({
                  eventId: event!._id.toString(),
                  rule: expect.arrayContaining(recurrence.rule),
                }),
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
          it("should not update the isSomeday(to true) field of an event - to instance someday event", async () => {
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
                payload: updatedPayload as CompassThisEvent["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: CompassEventStatus.CONFIRMED,
              },
            ]);

            await expect(updateChanges).rejects.toThrow(
              GenericError.DeveloperError.description,
            );
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
