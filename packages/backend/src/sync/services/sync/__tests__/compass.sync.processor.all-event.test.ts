import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";
import { Priorities } from "@core/constants/core.constants";
import {
  CalendarProvider,
  CompassCalendarSchema,
} from "@core/types/calendar.types";
import {
  BaseEventSchema,
  Categories_Recurrence,
  EventMetadataSchema,
  EventStatus,
  InstanceEventMetadataSchema,
  InstanceEventSchema,
  RecurringEventUpdateScope,
  RegularEventSchema,
  SomedayEventSchema,
  StandaloneEventMetadataSchema,
  ThisEventUpdate,
  TransitionCategoriesRecurrence,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
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
import { CompassEventParser } from "@backend/event/classes/compass.event.parser";
import {
  testCompassSeries,
  testCompassSeriesInGcal,
} from "@backend/event/classes/compass.event.parser.test.util";
import eventService from "@backend/event/services/event.service";
import {
  baseEventExclusionFilterExpr,
  instanceDateMongoAggregation,
} from "@backend/event/services/event.service.util";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";
import { StringV4Schema } from "../../../../../../core/src/types/type.utils";
import {
  isAllDay,
  isBase,
  isInstance,
} from "../../../../../../core/src/util/event/event.util";
import { getEventsInDb } from "../../../../__tests__/helpers/mock.db.queries";
import calendarService from "../../../../calendar/services/calendar.service";
import userService from "../../../../user/services/user.service";

describe(`CompassSyncProcessor - ${RecurringEventUpdateScope.ALL_EVENTS}`, () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  describe("Update - Instance Event: ", () => {
    describe("Calendar: ", () => {
      describe("Basic Edits: ", () => {
        it("should update the title field of all events in the recurrence", async () => {
          const user = await AuthDriver.googleSignup();
          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

          await userService.restartGoogleCalendarSync(user._id);

          const events = await getEventsInDb({
            calendar: calendar._id,
            isSomeday: false,
          });

          const baseEvents = events.filter(isBase);
          const baseEvent = faker.helpers.arrayElement(baseEvents);
          const instances = events
            .filter(isInstance)
            .filter((e) => e.recurrence?.eventId.equals(baseEvent._id));
          const instanceUpdate = faker.helpers.arrayElement(instances);

          const payload = {
            ...instanceUpdate,
            title: faker.lorem.sentence(3),
          };

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              calendar,
              providerSync: true,
              payload,
              applyTo: RecurringEventUpdateScope.ALL_EVENTS,
              status: EventStatus.CONFIRMED,
            },
          ]);

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

          // check that event was updated in db
          const updatedBase = await mongoService.event.findOne({
            _id: new ObjectId(instanceUpdate.recurrence!.eventId),
            calendar: calendar._id,
            title: payload.title,
          });

          expect(updatedBase).toBeDefined();

          // check that other instances were updated
          const updatedInstances = await mongoService.event
            .find({
              calendar: calendar._id,
              "recurrence.eventId": updatedBase?._id,
              $expr: baseEventExclusionFilterExpr,
              title: payload.title,
            })
            .toArray();

          expect(updatedInstances).toHaveLength(instances.length);

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              // check that base event has gcal attributes
              expect(updatedBase).toHaveProperty("metadata.id");
              // check that event exist in gcal
              const gcalEvent = await EventDriver.getGCalEvent(
                user._id,
                StandaloneEventMetadataSchema.parse(updatedBase?.metadata).id,
                calendar.metadata.id,
              );

              expect(gcalEvent).toHaveProperty("recurrence");

              // check that the base event has been updated in gcal
              expect(gcalEvent).toEqual(
                expect.objectContaining({
                  id: updatedBase?.metadata?.id,
                  summary: payload.title,
                }),
              );

              // check that other instances were updated in gcal
              await Promise.all(
                updatedInstances.map((instance) =>
                  expect(
                    EventDriver.getGCalEvent(
                      user._id,
                      InstanceEventMetadataSchema.parse(instance.metadata).id,
                      calendar.metadata.id,
                    ),
                  ).resolves.toEqual(
                    expect.objectContaining({
                      id: instance.metadata?.id,
                      summary: payload!.title,
                    }),
                  ),
                ),
              );
              break;
            }
          }
        });

        it("should update the description field of all events in the recurrence", async () => {
          const user = await AuthDriver.googleSignup();
          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

          await userService.restartGoogleCalendarSync(user._id);

          const events = await getEventsInDb({
            calendar: calendar._id,
            isSomeday: false,
          });

          const baseEvents = events.filter(isBase);
          const baseEvent = faker.helpers.arrayElement(baseEvents);
          const instances = events
            .filter(isInstance)
            .filter((e) => e.recurrence?.eventId.equals(baseEvent._id));
          const instanceUpdate = faker.helpers.arrayElement(instances);

          const payload = {
            ...instanceUpdate,
            description: faker.lorem.sentence(3),
          };

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              providerSync: true,
              calendar,
              payload,
              applyTo: RecurringEventUpdateScope.ALL_EVENTS,
              status: EventStatus.CONFIRMED,
            },
          ]);

          expect(updateChanges).toEqual(
            expect.arrayContaining([
              {
                title: payload.title,
                calendar: calendar._id,
                user: user._id,
                id: baseEvent._id,
                transition: [
                  "RECURRENCE_BASE",
                  TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
                ],
                category: Categories_Recurrence.RECURRENCE_BASE,
                operation: "SERIES_UPDATED",
              },
            ]),
          );

          // check that event was updated in db
          const updatedBase = await mongoService.event.findOne({
            _id: new ObjectId(instanceUpdate.recurrence!.eventId),
            calendar: calendar._id,
            description: payload.description,
          });

          expect(updatedBase).toBeDefined();

          // check that other instances were not updated
          const updatedInstances = await mongoService.event
            .find({
              calendar: calendar._id,
              "recurrence.eventId": baseEvent._id,
              $expr: baseEventExclusionFilterExpr,
              description: payload.description,
            })
            .toArray();

          expect(updatedInstances).toHaveLength(instances.length);

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              // check that base event has gcal attributes
              expect(updatedBase).toHaveProperty("metadata.id");
              // check that base event exist in gcal
              const gcalEvent = await EventDriver.getGCalEvent(
                user._id,
                StandaloneEventMetadataSchema.parse(updatedBase?.metadata).id,
                calendar.metadata.id,
              );

              expect(gcalEvent).toHaveProperty("recurrence");

              // check that the base event has been updated in gcal
              expect(gcalEvent).toEqual(
                expect.objectContaining({
                  id: updatedBase?.metadata?.id,
                  description: payload.description,
                }),
              );

              // check that other instances were updated in gcal
              await Promise.all(
                updatedInstances.map((instance) =>
                  expect(
                    EventDriver.getGCalEvent(
                      user._id,
                      InstanceEventMetadataSchema.parse(instance.metadata).id,
                      calendar.metadata.id,
                    ),
                  ).resolves.toEqual(
                    expect.objectContaining({
                      id: instance.metadata?.id,
                      description: payload!.description,
                    }),
                  ),
                ),
              );
              break;
            }
          }
        });

        it("should update the priority field of all events in the recurrence", async () => {
          const user = await AuthDriver.googleSignup();
          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

          await userService.restartGoogleCalendarSync(user._id);

          const events = await getEventsInDb({
            calendar: calendar._id,
            isSomeday: false,
          });

          const baseEvents = events.filter(isBase);
          const baseEvent = faker.helpers.arrayElement(baseEvents);
          const instances = events
            .filter(isInstance)
            .filter((e) => e.recurrence?.eventId.equals(baseEvent._id));
          const instanceUpdate = faker.helpers.arrayElement(instances);

          const updatedPayload = InstanceEventSchema.parse({
            ...instanceUpdate,
            priority: Priorities.RELATIONS,
          });

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              providerSync: true,
              calendar,
              payload: updatedPayload,
              applyTo: RecurringEventUpdateScope.ALL_EVENTS,
              status: EventStatus.CONFIRMED,
            },
          ]);

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

          // check that event was updated in db
          const updatedBase = await mongoService.event.findOne({
            _id: new ObjectId(instanceUpdate.recurrence!.eventId),
            calendar: calendar._id,
            priority: Priorities.RELATIONS,
          });

          expect(updatedBase).toBeDefined();

          // check that other instances were not updated
          const updatedInstances = await mongoService.event
            .find({
              calendar: calendar._id,
              "recurrence.eventId": baseEvent._id,
              $expr: baseEventExclusionFilterExpr,
              priority: Priorities.RELATIONS,
            })
            .toArray();

          expect(updatedInstances).toHaveLength(instances.length);

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              // check that event has gcal attributes
              expect(updatedBase).toHaveProperty("metadata.id");
              // check that event exist in gcal
              const gcalEvent = await EventDriver.getGCalEvent(
                user._id,
                StandaloneEventMetadataSchema.parse(updatedBase?.metadata).id,
                calendar.metadata.id,
              );

              expect(gcalEvent).toHaveProperty("recurrence");

              // check that the base event has been updated in gcal
              expect(gcalEvent).toEqual(
                expect.objectContaining({
                  id: updatedBase?.metadata?.id,
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

        it("should update the startDate field of all events in the recurrence", async () => {
          const user = await AuthDriver.googleSignup();
          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

          await userService.restartGoogleCalendarSync(user._id);

          const events = await getEventsInDb({
            calendar: calendar._id,
            isSomeday: false,
          });

          const baseEvents = events.filter(isBase);
          const baseEvent = faker.helpers.arrayElement(baseEvents);
          const instances = events
            .filter(isInstance)
            .filter((e) => e.recurrence?.eventId.equals(baseEvent._id));
          const instanceUpdate = faker.helpers.arrayElement(instances);

          const updatedPayload = {
            ...instanceUpdate,
            startDate: dayjs(instanceUpdate.endDate)
              .subtract(2, "hours")
              .toDate(),
          };

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              calendar,
              providerSync: true,
              payload: updatedPayload,
              applyTo: RecurringEventUpdateScope.ALL_EVENTS,
              status: EventStatus.CONFIRMED,
            },
          ]);

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

          const timeFilterExpr = {
            $expr: {
              $eq: [
                "$startDate",
                instanceDateMongoAggregation(
                  updatedPayload.startDate,
                  "startDate",
                )["startDate"],
              ],
            },
          };

          // check that event was updated in db
          const updatedBase = await mongoService.event.findOne({
            _id: new ObjectId(instanceUpdate.recurrence!.eventId),
            calendar: calendar._id,
            ...timeFilterExpr,
          });

          expect(updatedBase).toBeDefined();
          expect(updatedBase).not.toBeNull();

          // check that other instances were not updated
          const updatedInstances = await mongoService.event
            .find({
              calendar: calendar._id,
              "recurrence.eventId": baseEvent._id,
              $and: [{ $expr: baseEventExclusionFilterExpr }, timeFilterExpr],
            })
            .toArray();

          expect(updatedInstances).toHaveLength(instances.length);

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              // check that event has gcal attributes
              expect(updatedBase).toHaveProperty("metadata.id");
              // check that event exist in gcal
              const gcalEvent = await EventDriver.getGCalEvent(
                user._id,
                StandaloneEventMetadataSchema.parse(updatedBase?.metadata).id,
                calendar.metadata.id,
              );

              expect(gcalEvent).toHaveProperty("recurrence");

              // check that the base event has been updated in gcal
              expect(gcalEvent).toEqual(
                expect.objectContaining({
                  id: updatedBase?.metadata?.id,
                  start: expect.objectContaining({
                    dateTime: eventDatesToGcalDates(updatedBase!).start!
                      .dateTime!,
                  }),
                }),
              );

              // check that other instances were updated in gcal
              await Promise.all(
                updatedInstances.map((instance) =>
                  expect(
                    EventDriver.getGCalEvent(
                      user._id,
                      InstanceEventMetadataSchema.parse(instance.metadata).id,
                      calendar.metadata.id,
                    ),
                  ).resolves.toEqual(
                    expect.objectContaining({
                      id: instance.metadata?.id,
                      start: expect.objectContaining({
                        dateTime:
                          eventDatesToGcalDates(instance).start!.dateTime!,
                      }),
                    }),
                  ),
                ),
              );
              break;
            }
          }
        });

        it("should update the endDate field of all events in the recurrence", async () => {
          const user = await AuthDriver.googleSignup();
          const calendars = await calendarService.getAllByUser(user._id);

          await userService.restartGoogleCalendarSync(user._id);

          const events = await getEventsInDb({
            calendar: { $in: calendars.map((c) => c._id) },
            isSomeday: false,
          });

          const baseEvents = events.filter((e) => !isAllDay(e)).filter(isBase);
          const baseEvent = faker.helpers.arrayElement(baseEvents);

          const _calendar = await calendarService.getByUser(
            user._id,
            baseEvent.calendar,
          );

          const calendar = CompassCalendarSchema.parse(_calendar);

          const instances = events
            .filter(isInstance)
            .filter((e) => e.recurrence?.eventId.equals(baseEvent._id));

          const instanceUpdate = faker.helpers.arrayElement(instances);

          const updatedPayload = {
            ...instanceUpdate,
            _id: instanceUpdate._id,
            endDate: dayjs(instanceUpdate.startDate!).add(2, "hours").toDate(),
          };

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              calendar,
              providerSync: true,
              payload: updatedPayload,
              applyTo: RecurringEventUpdateScope.ALL_EVENTS,
              status: EventStatus.CONFIRMED,
            },
          ]);

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

          const timeFilterExpr = {
            $expr: {
              $eq: [
                "$endDate",
                instanceDateMongoAggregation(updatedPayload.endDate, "endDate")[
                  "endDate"
                ],
              ],
            },
          };

          // check that event was updated in db
          const updatedBase = await mongoService.event.findOne({
            _id: new ObjectId(instanceUpdate.recurrence!.eventId),
            calendar: calendar._id,
            ...timeFilterExpr,
          });

          expect(updatedBase).toBeDefined();
          expect(updatedBase).not.toBeNull();

          // check that other instances were updated
          const updatedInstances = await mongoService.event
            .find({
              calendar: calendar._id,
              "recurrence.eventId": baseEvent._id,
              $and: [{ $expr: baseEventExclusionFilterExpr }, timeFilterExpr],
            })
            .toArray();

          expect(updatedInstances).toHaveLength(instances.length);

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              // check that event has gcal attributes
              expect(updatedBase).toHaveProperty("metadata.id");
              // check that event exist in gcal
              const gcalEvent = await EventDriver.getGCalEvent(
                user._id,
                StandaloneEventMetadataSchema.parse(updatedBase?.metadata).id,
                calendar.metadata.id,
              );

              expect(gcalEvent).toHaveProperty("recurrence");

              // check that the base event has been updated in gcal
              expect(gcalEvent).toEqual(
                expect.objectContaining({
                  id: updatedBase?.metadata?.id,
                  end: expect.objectContaining({
                    dateTime: eventDatesToGcalDates(updatedBase!).end!
                      .dateTime!,
                  }),
                }),
              );

              // check that other instances were updated in gcal
              await Promise.all(
                updatedInstances.map((instance) =>
                  expect(
                    EventDriver.getGCalEvent(
                      user._id,
                      InstanceEventMetadataSchema.parse(instance.metadata).id,
                      calendar.metadata.id,
                    ),
                  ).resolves.toEqual(
                    expect.objectContaining({
                      id: instance.metadata?.id,
                      end: expect.objectContaining({
                        dateTime:
                          eventDatesToGcalDates(instance).end!.dateTime!,
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
          const user = await AuthDriver.googleSignup();
          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

          await userService.restartGoogleCalendarSync(user._id);

          const events = await getEventsInDb({
            calendar: calendar._id,
            isSomeday: false,
          });

          const baseEvents = events.filter(isBase);
          const baseEvent = faker.helpers.arrayElement(baseEvents);
          const instances = events
            .filter(isInstance)
            .filter((e) => e.recurrence?.eventId.equals(baseEvent._id));
          const instanceUpdate = faker.helpers.arrayElement(instances);

          const updatedPayload = {
            ...instanceUpdate,
            title: "Transitioned to Someday Event",
            isSomeday: true,
          };

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              payload: updatedPayload,
              calendar,
              providerSync: true,
              applyTo: RecurringEventUpdateScope.ALL_EVENTS,
              status: EventStatus.CONFIRMED,
            },
          ]);

          expect(updateChanges).toEqual(
            expect.arrayContaining([
              {
                calendar: calendar._id,
                user: user._id,
                id: baseEvent._id,
                title: updatedPayload.title,
                transition: [
                  "RECURRENCE_BASE",
                  TransitionCategoriesRecurrence.RECURRENCE_BASE_SOMEDAY_CONFIRMED,
                ],
                category: Categories_Recurrence.RECURRENCE_BASE,
                operation: "SERIES_UPDATED",
              },
            ]),
          );

          const baseToSomedayEvent = await mongoService.event.findOne({
            calendar: calendar._id,
            title: updatedPayload.title,
            isSomeday: true,
          });

          expect(baseToSomedayEvent).toBeDefined();

          // same id kept across transition
          expect(
            baseToSomedayEvent!._id.equals(updatedPayload.recurrence?.eventId),
          ).toBe(true);

          console.log(baseToSomedayEvent, "BASE TO SOMEDAY EVENT");
          expect(
            SomedayEventSchema.safeParse(baseToSomedayEvent).success,
          ).toEqual(true);

          expect(updatedPayload.recurrence?.eventId).toBeInstanceOf(ObjectId);

          // check that instances provider data were deleted
          const newInstances = await mongoService.event
            .find({
              calendar: calendar._id,
              "recurrence.eventId": updatedPayload.recurrence?.eventId,
              $expr: baseEventExclusionFilterExpr,
              isSomeday: true,
            })
            .toArray();

          expect(newInstances).toHaveLength(instances.length);

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              // check that event has no gcal attributes
              expect(baseToSomedayEvent).not.toHaveProperty("metadata.id");

              expect(baseToSomedayEvent).not.toHaveProperty(
                "metadata.recurringEventId",
              );

              newInstances.forEach((instance) => {
                expect.objectContaining({
                  isSomeday: true,
                  updatedAt: expect.any(Date),
                  origin: CalendarProvider.COMPASS,
                });

                expect(instance).not.toHaveProperty("metadata.id");
                expect(instance).not.toHaveProperty(
                  "metadata.recurringEventId",
                );
              });

              // check that the base event has been deleted in gcal
              await expect(
                EventDriver.getGCalEvent(
                  user._id,
                  InstanceEventMetadataSchema.parse(instanceUpdate.metadata)
                    .recurringEventId,
                  calendar.metadata.id,
                ),
              ).rejects.toThrow(
                `Event with id ${InstanceEventMetadataSchema.parse(instanceUpdate.metadata).recurringEventId} not found`,
              );

              // check that old instances has been deleted in gcal
              await Promise.all(
                instances.map((instance) =>
                  expect(
                    EventDriver.getGCalEvent(
                      user._id,
                      StringV4Schema.parse(instance.metadata?.id),
                      calendar.metadata.id,
                    ),
                  ).rejects.toThrow(
                    `Event with id ${instance.metadata?.id} not found`,
                  ),
                ),
              );
              break;
            }
          }
        });

        it("should update the recurrence(rule) field of an event - to base calendar event", async () => {
          const user = await AuthDriver.googleSignup();
          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

          const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
          const payload = createMockBaseEvent({
            recurrence,
            calendar: calendar._id,
          });

          const event: ThisEventUpdate = {
            payload,
            status: EventStatus.CONFIRMED,
            applyTo: RecurringEventUpdateScope.THIS_EVENT,
            calendar,
            providerSync: true,
          };

          const parser = new CompassEventParser(event);

          await parser.init();

          await parser.createEvent();

          const { baseEvent, instances } = await testCompassSeries(payload, 10);

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE:
              await testCompassSeriesInGcal(baseEvent!, instances);
              break;
          }

          const instanceToUpdate = faker.helpers.arrayElement(instances);

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
                calendar: calendar._id,
                user: user._id,
                id: payload._id,
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

          const updatedBase = await mongoService.event.findOne({
            _id: instanceToUpdate.recurrence.eventId,
            calendar: calendar._id,
          });

          expect(updatedBase).toBeDefined();
          expect(updatedBase).not.toBeNull();

          const { baseEvent: updatedBaseEvent, instances: updatedInstances } =
            await testCompassSeries(BaseEventSchema.parse(updatedBase), 5);

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE:
              await testCompassSeriesInGcal(
                updatedBaseEvent!,
                updatedInstances,
              );
              break;
          }
        });

        it("should update the recurrence(delete recurrence field) fields of an event - change base to regular calendar event", async () => {
          const user = await AuthDriver.googleSignup();
          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

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

          // check that event is in db
          const event = await eventService.readById(calendar._id, payload._id);

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
                  isSomeday: false,
                  updatedAt: expect.any(Date),
                  origin: CalendarProvider.COMPASS,
                }),
              ),
            ),
          );

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              // check that event has gcal attributes
              expect(event).toHaveProperty("metadata.id");

              instances.forEach((instance) => {
                expect(instance).toHaveProperty("metadata.id");
                expect(instance).toHaveProperty("metadata.recurringEventId");
              });

              // check that event exist in gcal
              const gcalEvent = await EventDriver.getGCalEvent(
                user._id,
                EventMetadataSchema.parse(event.metadata).id,
                calendar.metadata.id,
              );

              const gcalInstances = await Promise.all(
                instances.map((instance) =>
                  EventDriver.getGCalEvent(
                    user._id,
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

          const instanceUpdate = faker.helpers.arrayElement(instances);

          expect(instanceUpdate).toBeDefined();

          Reflect.deleteProperty(instanceUpdate, "recurrence");

          const updatedPayload = RegularEventSchema.parse({
            ...instanceUpdate,
            title: "Transitioned to Regular Event",
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
                calendar: calendar._id,
                user: user._id,
                id: payload._id,
                title: updatedPayload.title,
                transition: [
                  "RECURRENCE_BASE",
                  TransitionCategoriesRecurrence.REGULAR_CONFIRMED,
                ],
                category: Categories_Recurrence.RECURRENCE_BASE,
                operation: "SERIES_UPDATED",
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
              _id: baseToStandaloneEvent!._id,
              title: updatedPayload.title,
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

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              // check that event has gcal attributes
              expect(baseToStandaloneEvent?.metadata).toHaveProperty("id");

              // check that the base event has been updated in gcal
              const standaloneGcalEvent = await EventDriver.getGCalEvent(
                user._id,
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
                      user._id,
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
      const user = await AuthDriver.googleSignup();
      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
      const status = EventStatus.CONFIRMED;
      const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
      const payload = createMockBaseEvent({
        recurrence,
        calendar: calendar._id,
      });

      const parser = new CompassEventParser({
        calendar,
        payload,
        status,
        providerSync: true,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      });

      await parser.init();

      await parser.createEvent();

      const { baseEvent, instances } = await testCompassSeries(payload, 10);

      switch (calendar.metadata.provider) {
        case CalendarProvider.GOOGLE:
          await testCompassSeriesInGcal(baseEvent!, instances);
          break;
      }

      const instanceToUpdate = faker.helpers.arrayElement(instances);

      expect(instanceToUpdate).toBeDefined();

      const updateChanges = await CompassSyncProcessor.processEvents([
        {
          payload: instanceToUpdate,
          calendar,
          providerSync: true,
          applyTo: RecurringEventUpdateScope.ALL_EVENTS,
          status: EventStatus.CANCELLED,
        },
      ]);

      expect(updateChanges).toEqual(
        expect.arrayContaining([
          {
            calendar: calendar._id,
            user: user._id,
            id: payload._id,
            title: instanceToUpdate.title,
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
        mongoService.event.findOne({
          calendar: instanceToUpdate.calendar,
          _id: new ObjectId(instanceToUpdate._id),
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

      switch (calendar.metadata.provider) {
        case CalendarProvider.GOOGLE:
          await expect(
            EventDriver.getGCalEvent(
              user._id,
              EventMetadataSchema.parse(instanceToUpdate.metadata).id,
              calendar.metadata.id,
            ),
          ).rejects.toThrow(
            `Event with id ${instanceToUpdate.metadata?.id} not found`,
          );

          await Promise.all(
            instances.map((instance) =>
              expect(
                EventDriver.getGCalEvent(
                  calendar.user,
                  InstanceEventMetadataSchema.parse(instance.metadata).id,
                  calendar.metadata.id,
                ),
              ).rejects.toThrow(
                `Event with id ${instance.metadata?.id} not found`,
              ),
            ),
          );

          break;
      }
    });
  });
});
