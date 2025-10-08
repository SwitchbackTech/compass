import { faker } from "@faker-js/faker";
import { Priorities } from "@core/constants/core.constants";
import {
  CalendarProvider,
  Categories_Recurrence,
  CompassEventStatus,
  CompassThisEvent,
  RecurringEventUpdateScope,
  Schema_Event_Recur_Base,
  WithCompassId,
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
import {
  testCompassEventNotInGcal,
  testCompassSeries,
  testCompassSeriesInGcal,
} from "@backend/event/classes/compass.event.parser.test.util";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";

describe.each([{ calendarProvider: CalendarProvider.GOOGLE }])(
  `CompassSyncProcessor  - $calendarProvider calendar: ${RecurringEventUpdateScope.THIS_EVENT} - Base Event: `,
  ({ calendarProvider }) => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    describe("Create: ", () => {
      it("should create a someday event", async () => {
        const { user: _user } = await UtilDriver.setupTestUser();
        const user = _user._id.toString();
        const isSomeday = true;
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
              transition: [null, "RECURRENCE_BASE_SOMEDAY_CONFIRMED"],
              category: Categories_Recurrence.RECURRENCE_BASE_SOMEDAY,
              operation: "RECURRENCE_BASE_SOMEDAY_CREATED",
            },
          ]),
        );

        const { baseEvent, instances } = await testCompassSeries(payload, 10);

        switch (calendarProvider) {
          case CalendarProvider.GOOGLE:
            await Promise.all([
              testCompassEventNotInGcal(baseEvent),
              ...instances.map(testCompassEventNotInGcal),
            ]);
            break;
        }
      });

      it("should create a calendar event", async () => {
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
        const { baseEvent, instances } = await testCompassSeries(payload, 10);

        const calendarProvider = CalendarProvider.GOOGLE;

        switch (calendarProvider) {
          case CalendarProvider.GOOGLE: {
            await testCompassSeriesInGcal(baseEvent, instances);
            break;
          }
        }
      });
    });

    describe("Update: ", () => {
      describe.each([{ type: "Someday" }, { type: "Calendar" }])(
        "$type: ",
        ({ type }) => {
          describe("Update: ", () => {
            describe("Basic Edits: ", () => {
              it("should not directly update the title field of a base event", async () => {
                const { user: _user } = await UtilDriver.setupTestUser();
                const user = _user._id.toString();
                const isSomeday = type === "Someday";
                const category = isSomeday
                  ? Categories_Recurrence.RECURRENCE_BASE_SOMEDAY
                  : Categories_Recurrence.RECURRENCE_BASE;
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
                      transition: [null, `${category}_CONFIRMED`],
                      category,
                      operation: `${category}_CREATED`,
                    },
                  ]),
                );

                const { baseEvent } = await testCompassSeries(payload, 10);

                const updatedPayload = {
                  ...baseEvent,
                  _id: baseEvent._id.toString(),
                  title: faker.lorem.sentence(3),
                } as WithCompassId<Schema_Event_Recur_Base>;

                await expect(
                  CompassSyncProcessor.processEvents([
                    {
                      payload: updatedPayload as CompassThisEvent["payload"],
                      applyTo: RecurringEventUpdateScope.THIS_EVENT,
                      status: CompassEventStatus.CONFIRMED,
                    },
                  ]),
                ).rejects.toThrow(GenericError.BadRequest.description);
              });

              it("should not directly update the description field of a base event", async () => {
                const { user: _user } = await UtilDriver.setupTestUser();
                const user = _user._id.toString();
                const isSomeday = type === "Someday";
                const category = isSomeday
                  ? Categories_Recurrence.RECURRENCE_BASE_SOMEDAY
                  : Categories_Recurrence.RECURRENCE_BASE;
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
                      transition: [null, `${category}_CONFIRMED`],
                      category,
                      operation: `${category}_CREATED`,
                    },
                  ]),
                );

                const { baseEvent } = await testCompassSeries(payload, 10);

                const updatedPayload = {
                  ...baseEvent,
                  _id: baseEvent._id.toString(),
                  description: faker.lorem.sentence(3),
                } as WithCompassId<Schema_Event_Recur_Base>;

                await expect(
                  CompassSyncProcessor.processEvents([
                    {
                      payload: updatedPayload as CompassThisEvent["payload"],
                      applyTo: RecurringEventUpdateScope.THIS_EVENT,
                      status: CompassEventStatus.CONFIRMED,
                    },
                  ]),
                ).rejects.toThrow(GenericError.BadRequest.description);
              });

              it("should not directly update the priority field of a base event", async () => {
                const { user: _user } = await UtilDriver.setupTestUser();
                const user = _user._id.toString();
                const isSomeday = type === "Someday";
                const category = isSomeday
                  ? Categories_Recurrence.RECURRENCE_BASE_SOMEDAY
                  : Categories_Recurrence.RECURRENCE_BASE;
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
                      transition: [null, `${category}_CONFIRMED`],
                      category,
                      operation: `${category}_CREATED`,
                    },
                  ]),
                );

                const { baseEvent } = await testCompassSeries(payload, 10);

                const updatedPayload = {
                  ...baseEvent,
                  _id: baseEvent._id.toString(),
                  priority: Priorities.RELATIONS,
                } as WithCompassId<Schema_Event_Recur_Base>;

                await expect(
                  CompassSyncProcessor.processEvents([
                    {
                      payload: updatedPayload as CompassThisEvent["payload"],
                      applyTo: RecurringEventUpdateScope.THIS_EVENT,
                      status: CompassEventStatus.CONFIRMED,
                    },
                  ]),
                ).rejects.toThrow(GenericError.BadRequest.description);
              });

              it("should directly update the startDate field of a base event", async () => {
                const { user: _user } = await UtilDriver.setupTestUser();
                const user = _user._id.toString();
                const isSomeday = type === "Someday";
                const category = isSomeday
                  ? Categories_Recurrence.RECURRENCE_BASE_SOMEDAY
                  : Categories_Recurrence.RECURRENCE_BASE;
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
                      transition: [null, `${category}_CONFIRMED`],
                      category,
                      operation: `${category}_CREATED`,
                    },
                  ]),
                );

                const { baseEvent } = await testCompassSeries(payload, 10);

                const updatedPayload = {
                  ...baseEvent,
                  _id: baseEvent._id.toString(),
                  startDate: parseCompassEventDate(baseEvent.endDate!)
                    .subtract(2, "hours")
                    .toISOString(),
                } as WithCompassId<Schema_Event_Recur_Base>;

                await expect(
                  CompassSyncProcessor.processEvents([
                    {
                      payload: updatedPayload as CompassThisEvent["payload"],
                      applyTo: RecurringEventUpdateScope.THIS_EVENT,
                      status: CompassEventStatus.CONFIRMED,
                    },
                  ]),
                ).rejects.toThrow(GenericError.BadRequest.description);
              });

              it("should directly update the endDate field of a base event", async () => {
                const { user: _user } = await UtilDriver.setupTestUser();
                const user = _user._id.toString();
                const isSomeday = type === "Someday";
                const category = isSomeday
                  ? Categories_Recurrence.RECURRENCE_BASE_SOMEDAY
                  : Categories_Recurrence.RECURRENCE_BASE;
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
                      transition: [null, `${category}_CONFIRMED`],
                      category,
                      operation: `${category}_CREATED`,
                    },
                  ]),
                );

                const { baseEvent } = await testCompassSeries(payload, 10);

                const updatedPayload = {
                  ...baseEvent,
                  _id: baseEvent._id.toString(),
                  endDate: parseCompassEventDate(baseEvent.startDate!)
                    .add(2, "hours")
                    .toISOString(),
                } as WithCompassId<Schema_Event_Recur_Base>;

                await expect(
                  CompassSyncProcessor.processEvents([
                    {
                      payload: updatedPayload as CompassThisEvent["payload"],
                      applyTo: RecurringEventUpdateScope.THIS_EVENT,
                      status: CompassEventStatus.CONFIRMED,
                    },
                  ]),
                ).rejects.toThrow(GenericError.BadRequest.description);
              });

              it("should directly update the recurrence field of a base event", async () => {
                const { user: _user } = await UtilDriver.setupTestUser();
                const user = _user._id.toString();
                const isSomeday = type === "Someday";
                const category = isSomeday
                  ? Categories_Recurrence.RECURRENCE_BASE_SOMEDAY
                  : Categories_Recurrence.RECURRENCE_BASE;
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
                      transition: [null, `${category}_CONFIRMED`],
                      category,
                      operation: `${category}_CREATED`,
                    },
                  ]),
                );

                const { baseEvent } = await testCompassSeries(payload, 10);

                const updatedPayload = {
                  ...baseEvent,
                  _id: baseEvent._id.toString(),
                  recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
                };

                await expect(
                  CompassSyncProcessor.processEvents([
                    {
                      payload: updatedPayload as CompassThisEvent["payload"],
                      applyTo: RecurringEventUpdateScope.THIS_EVENT,
                      status: CompassEventStatus.CONFIRMED,
                    },
                  ]),
                ).rejects.toThrow(GenericError.BadRequest.description);
              });
            });
          });

          describe("Delete: ", () => {
            it(
              `should not directly delete a ${type} base event`.toLowerCase(),
              async () => {
                const { user: _user } = await UtilDriver.setupTestUser();
                const user = _user._id.toString();
                const isSomeday = type === "Someday";
                const category = isSomeday
                  ? Categories_Recurrence.RECURRENCE_BASE_SOMEDAY
                  : Categories_Recurrence.RECURRENCE_BASE;
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
                      transition: [null, `${category}_CONFIRMED`],
                      category,
                      operation: `${category}_CREATED`,
                    },
                  ]),
                );

                const { baseEvent } = await testCompassSeries(payload, 10);

                const deletePayload = {
                  ...baseEvent,
                  _id: baseEvent._id.toString(),
                } as WithCompassId<Schema_Event_Recur_Base>;

                await expect(
                  CompassSyncProcessor.processEvents([
                    {
                      payload: deletePayload as CompassThisEvent["payload"],
                      applyTo: RecurringEventUpdateScope.THIS_EVENT,
                      status: CompassEventStatus.CANCELLED,
                    },
                  ]),
                ).rejects.toThrow(GenericError.BadRequest.description);
              },
            );
          });
        },
      );
    });
  },
);
