import { faker } from "@faker-js/faker";
import { Priorities } from "@core/constants/core.constants";
import { CalendarProvider } from "@core/types/calendar.types";
import {
  Categories_Recurrence,
  EventStatus,
  RecurringEventUpdateScope,
  ThisEventUpdate,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createMockBaseEvent } from "@core/util/test/ccal.event.factory";
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
import { UserDriver } from "../../../../../__tests__/drivers/user.driver";

describe.each([{ calendarProvider: CalendarProvider.GOOGLE }])(
  `CompassSyncProcessor  - $calendarProvider calendar: ${RecurringEventUpdateScope.THIS_EVENT} - Base Event: `,
  ({ calendarProvider }) => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    describe("Create: ", () => {
      it("should create a someday event", async () => {
        const _user = await UserDriver.createGoogleAuthUser();
        const user = _user._id.toString();
        const isSomeday = true;
        const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
        const payload = createMockBaseEvent({ isSomeday, user, recurrence });

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
        const _user = await UserDriver.createGoogleAuthUser();
        const user = _user._id.toString();
        const isSomeday = false;
        const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
        const payload = createMockBaseEvent({ isSomeday, user, recurrence });

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
                const _user = await UserDriver.createGoogleAuthUser();
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
                    payload: payload as ThisEventUpdate["payload"],
                    applyTo: RecurringEventUpdateScope.THIS_EVENT,
                    status: EventStatus.CONFIRMED,
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
                };

                await expect(
                  CompassSyncProcessor.processEvents([
                    {
                      payload: updatedPayload,
                      applyTo: RecurringEventUpdateScope.THIS_EVENT,
                      status: EventStatus.CONFIRMED,
                    },
                  ]),
                ).rejects.toThrow(GenericError.BadRequest.description);
              });

              it("should not directly update the description field of a base event", async () => {
                const _user = await UserDriver.createGoogleAuthUser();
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
                    payload: payload as ThisEventUpdate["payload"],
                    applyTo: RecurringEventUpdateScope.THIS_EVENT,
                    status: EventStatus.CONFIRMED,
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
                };

                await expect(
                  CompassSyncProcessor.processEvents([
                    {
                      payload: updatedPayload as ThisEventUpdate["payload"],
                      applyTo: RecurringEventUpdateScope.THIS_EVENT,
                      status: EventStatus.CONFIRMED,
                    },
                  ]),
                ).rejects.toThrow(GenericError.BadRequest.description);
              });

              it("should not directly update the priority field of a base event", async () => {
                const _user = await UserDriver.createGoogleAuthUser();
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
                    payload: payload as ThisEventUpdate["payload"],
                    applyTo: RecurringEventUpdateScope.THIS_EVENT,
                    status: EventStatus.CONFIRMED,
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
                };

                await expect(
                  CompassSyncProcessor.processEvents([
                    {
                      payload: updatedPayload as ThisEventUpdate["payload"],
                      applyTo: RecurringEventUpdateScope.THIS_EVENT,
                      status: EventStatus.CONFIRMED,
                    },
                  ]),
                ).rejects.toThrow(GenericError.BadRequest.description);
              });

              it("should directly update the startDate field of a base event", async () => {
                const _user = await UserDriver.createGoogleAuthUser();
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
                    payload: payload as ThisEventUpdate["payload"],
                    applyTo: RecurringEventUpdateScope.THIS_EVENT,
                    status: EventStatus.CONFIRMED,
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
                  startDate: dayjs(baseEvent.endDate!)
                    .subtract(2, "hours")
                    .toDate(),
                };

                await expect(
                  CompassSyncProcessor.processEvents([
                    {
                      payload: updatedPayload as ThisEventUpdate["payload"],
                      applyTo: RecurringEventUpdateScope.THIS_EVENT,
                      status: EventStatus.CONFIRMED,
                    },
                  ]),
                ).rejects.toThrow(GenericError.BadRequest.description);
              });

              it("should directly update the endDate field of a base event", async () => {
                const _user = await UserDriver.createGoogleAuthUser();
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
                    payload: payload as ThisEventUpdate["payload"],
                    applyTo: RecurringEventUpdateScope.THIS_EVENT,
                    status: EventStatus.CONFIRMED,
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
                  endDate: dayjs(baseEvent.startDate!).add(2, "hours").toDate(),
                };

                await expect(
                  CompassSyncProcessor.processEvents([
                    {
                      user: _user._id,
                      payload: updatedPayload,
                      applyTo: RecurringEventUpdateScope.THIS_EVENT,
                      status: EventStatus.CONFIRMED,
                    },
                  ]),
                ).rejects.toThrow(GenericError.BadRequest.description);
              });

              it("should directly update the recurrence field of a base event", async () => {
                const _user = await UserDriver.createGoogleAuthUser();
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
                    payload: payload as ThisEventUpdate["payload"],
                    applyTo: RecurringEventUpdateScope.THIS_EVENT,
                    status: EventStatus.CONFIRMED,
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
                      payload: updatedPayload as ThisEventUpdate["payload"],
                      applyTo: RecurringEventUpdateScope.THIS_EVENT,
                      status: EventStatus.CONFIRMED,
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
                const _user = await UserDriver.createGoogleAuthUser();
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
                    payload: payload as ThisEventUpdate["payload"],
                    applyTo: RecurringEventUpdateScope.THIS_EVENT,
                    status: EventStatus.CONFIRMED,
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
                };

                await expect(
                  CompassSyncProcessor.processEvents([
                    {
                      payload: deletePayload as ThisEventUpdate["payload"],
                      applyTo: RecurringEventUpdateScope.THIS_EVENT,
                      status: EventStatus.CANCELLED,
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
