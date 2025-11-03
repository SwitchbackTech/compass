import { faker } from "@faker-js/faker";
import { Priorities } from "@core/constants/core.constants";
import { CalendarProvider } from "@core/types/calendar.types";
import {
  Categories_Recurrence,
  EventStatus,
  RecurringEventUpdateScope,
  TransitionCategoriesRecurrence,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createMockBaseEvent } from "@core/util/test/ccal.event.factory";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import { CalendarDriver } from "@backend/__tests__/drivers/calendar.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import {
  testCompassEventNotInGcal,
  testCompassSeries,
  testCompassSeriesInGcal,
} from "@backend/event/classes/compass.event.parser.test.util";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";

describe(`CompassSyncProcessor - ${RecurringEventUpdateScope.THIS_EVENT} - Base Event: `, () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  describe("Create: ", () => {
    it("should create a someday event", async () => {
      const user = await AuthDriver.googleSignup();
      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
      const isSomeday = true;
      const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
      const payload = createMockBaseEvent({
        isSomeday,
        calendar: calendar._id,
        recurrence,
      });

      const changes = await CompassSyncProcessor.processEvents([
        {
          payload,
          calendar,
          providerSync: true,
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
              TransitionCategoriesRecurrence.RECURRENCE_BASE_SOMEDAY_CONFIRMED,
            ],
            category: Categories_Recurrence.RECURRENCE_BASE_SOMEDAY,
            operation: "SOMEDAY_SERIES_CREATED",
          },
        ]),
      );

      const { baseEvent, instances } = await testCompassSeries(payload, 10);

      switch (calendar.metadata.provider) {
        case CalendarProvider.GOOGLE:
          await Promise.all([
            testCompassEventNotInGcal(baseEvent),
            ...instances.map(testCompassEventNotInGcal),
          ]);
          break;
      }
    });

    it("should create a calendar event", async () => {
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
      const { baseEvent, instances } = await testCompassSeries(payload, 10);

      switch (calendar.metadata.provider) {
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
            it("should update the title field of a base event and its instances", async () => {
              const user = await AuthDriver.googleSignup();
              const calendar = await CalendarDriver.getRandomUserCalendar(
                user._id,
              );
              const isSomeday = type === "Someday";
              const category = isSomeday
                ? Categories_Recurrence.RECURRENCE_BASE_SOMEDAY
                : Categories_Recurrence.RECURRENCE_BASE;
              const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
              const payload = createMockBaseEvent({
                isSomeday,
                calendar: calendar._id,
                recurrence,
              });

              const changes = await CompassSyncProcessor.processEvents([
                {
                  payload,
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
                    user: user._id,
                    id: payload._id,
                    title: payload.title,
                    transition: [null, `${category}_${EventStatus.CONFIRMED}`],
                    category,
                    operation: isSomeday
                      ? "SOMEDAY_SERIES_CREATED"
                      : "SERIES_CREATED",
                  },
                ]),
              );

              const { baseEvent } = await testCompassSeries(payload, 10);

              const updatedPayload = {
                ...baseEvent,
                title: faker.lorem.sentence(3),
              };

              await CompassSyncProcessor.processEvents([
                {
                  payload: updatedPayload,
                  calendar,
                  providerSync: true,
                  applyTo: RecurringEventUpdateScope.THIS_EVENT,
                  status: EventStatus.CONFIRMED,
                },
              ]);

              const { baseEvent: updatedBaseEvent, instances } =
                await testCompassSeries(updatedPayload, 10);

              expect(updatedBaseEvent.title).toBe(updatedPayload.title);

              for (const instance of instances) {
                expect(instance.title).toBe(updatedPayload.title);
              }
            });

            it("should update the description field of a base event and its instances", async () => {
              const user = await AuthDriver.googleSignup();
              const calendar = await CalendarDriver.getRandomUserCalendar(
                user._id,
              );
              const isSomeday = type === "Someday";
              const category = isSomeday
                ? Categories_Recurrence.RECURRENCE_BASE_SOMEDAY
                : Categories_Recurrence.RECURRENCE_BASE;
              const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
              const payload = createMockBaseEvent({
                isSomeday,
                calendar: calendar._id,
                recurrence,
              });

              const changes = await CompassSyncProcessor.processEvents([
                {
                  payload,
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
                    user: user._id,
                    id: payload._id,
                    title: payload.title,
                    transition: [null, `${category}_${EventStatus.CONFIRMED}`],
                    category,
                    operation: isSomeday
                      ? "SOMEDAY_SERIES_CREATED"
                      : "SERIES_CREATED",
                  },
                ]),
              );

              const { baseEvent } = await testCompassSeries(payload, 10);

              const updatedPayload = {
                ...baseEvent,
                description: faker.lorem.sentence(3),
              };

              await CompassSyncProcessor.processEvents([
                {
                  payload: updatedPayload,
                  calendar,
                  providerSync: true,
                  applyTo: RecurringEventUpdateScope.THIS_EVENT,
                  status: EventStatus.CONFIRMED,
                },
              ]);

              const { baseEvent: updatedBaseEvent, instances } =
                await testCompassSeries(updatedPayload, 10);

              expect(updatedBaseEvent.description).toBe(
                updatedPayload.description,
              );

              for (const instance of instances) {
                expect(instance.description).toBe(updatedPayload.description);
              }
            });

            it("should update the priority field of a base event and its instances", async () => {
              const user = await AuthDriver.googleSignup();
              const calendar = await CalendarDriver.getRandomUserCalendar(
                user._id,
              );
              const isSomeday = type === "Someday";
              const category = isSomeday
                ? Categories_Recurrence.RECURRENCE_BASE_SOMEDAY
                : Categories_Recurrence.RECURRENCE_BASE;
              const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };

              const payload = createMockBaseEvent({
                isSomeday,
                calendar: calendar._id,
                recurrence,
                priority: Priorities.SELF,
              });

              const changes = await CompassSyncProcessor.processEvents([
                {
                  payload,
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
                    user: user._id,
                    id: payload._id,
                    title: payload.title,
                    transition: [null, `${category}_${EventStatus.CONFIRMED}`],
                    category,
                    operation: isSomeday
                      ? "SOMEDAY_SERIES_CREATED"
                      : "SERIES_CREATED",
                  },
                ]),
              );

              const { baseEvent } = await testCompassSeries(payload, 10);

              const updatedPayload = {
                ...baseEvent,
                priority: Priorities.RELATIONS,
              };

              await CompassSyncProcessor.processEvents([
                {
                  payload: updatedPayload,
                  calendar,
                  providerSync: true,
                  applyTo: RecurringEventUpdateScope.THIS_EVENT,
                  status: EventStatus.CONFIRMED,
                },
              ]);

              const { baseEvent: updatedBaseEvent, instances } =
                await testCompassSeries(updatedPayload, 10);

              expect(updatedBaseEvent.priority).toBe(updatedPayload.priority);

              for (const instance of instances) {
                expect(instance.priority).toBe(updatedPayload.priority);
              }
            });

            it("should update the startDate and endDate field of a base event and its instances", async () => {
              const user = await AuthDriver.googleSignup();
              const calendar = await CalendarDriver.getRandomUserCalendar(
                user._id,
              );
              const isSomeday = type === "Someday";
              const category = isSomeday
                ? Categories_Recurrence.RECURRENCE_BASE_SOMEDAY
                : Categories_Recurrence.RECURRENCE_BASE;
              const recurrence = { rule: ["RRULE:FREQ=DAILY;COUNT=10"] };
              const payload = createMockBaseEvent(
                { isSomeday, calendar: calendar._id, recurrence },
                true,
              );

              const changes = await CompassSyncProcessor.processEvents([
                {
                  payload,
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
                    user: user._id,
                    id: payload._id,
                    title: payload.title,
                    transition: [null, `${category}_${EventStatus.CONFIRMED}`],
                    category,
                    operation: isSomeday
                      ? "SOMEDAY_SERIES_CREATED"
                      : "SERIES_CREATED",
                  },
                ]),
              );

              const { baseEvent, instances: oldInstances } =
                await testCompassSeries(payload, 10);

              const updatedPayload = {
                ...baseEvent,
                startDate: dayjs(baseEvent.startDate!).add(1, "day").toDate(),
                endDate: dayjs(baseEvent.endDate!).add(1, "day").toDate(),
              };

              await CompassSyncProcessor.processEvents([
                {
                  payload: updatedPayload,
                  calendar,
                  providerSync: true,
                  applyTo: RecurringEventUpdateScope.THIS_EVENT,
                  status: EventStatus.CONFIRMED,
                },
              ]);

              const { baseEvent: updatedBaseEvent, instances } =
                await testCompassSeries(updatedPayload, 10);

              expect(updatedBaseEvent.startDate).toEqual(
                updatedPayload.startDate,
              );

              console.log(
                instances.map((i) => [i.startDate, i.originalStartDate]),
                "instances after startDate update",
              );

              // check instances shifted by 1 day
              const oldFirstInstance = oldInstances.find((i) =>
                dayjs(i.startDate).isSame(baseEvent.startDate),
              );

              expect(oldFirstInstance).toBeDefined();

              const oldSecondInstance = oldInstances.find((i) =>
                dayjs(i.startDate).isSame(oldFirstInstance?.endDate),
              );

              expect(oldSecondInstance).toBeDefined();

              const newFirstInstance = instances.find((i) =>
                dayjs(i.startDate).isSame(dayjs(updatedBaseEvent.startDate)),
              );

              expect(
                dayjs(newFirstInstance?.startDate).isSame(
                  oldSecondInstance?.startDate,
                ),
              ).toBe(true);
            });

            it("should update the recurrence field of a base event and its instances", async () => {
              const user = await AuthDriver.googleSignup();
              const calendar = await CalendarDriver.getRandomUserCalendar(
                user._id,
              );
              const isSomeday = type === "Someday";
              const category = isSomeday
                ? Categories_Recurrence.RECURRENCE_BASE_SOMEDAY
                : Categories_Recurrence.RECURRENCE_BASE;
              const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };

              const payload = createMockBaseEvent({
                isSomeday,
                calendar: calendar._id,
                recurrence,
                priority: Priorities.SELF,
              });

              const changes = await CompassSyncProcessor.processEvents([
                {
                  payload,
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
                    user: user._id,
                    id: payload._id,
                    title: payload.title,
                    transition: [null, `${category}_${EventStatus.CONFIRMED}`],
                    category,
                    operation: isSomeday
                      ? "SOMEDAY_SERIES_CREATED"
                      : "SERIES_CREATED",
                  },
                ]),
              );

              const { baseEvent } = await testCompassSeries(payload, 10);

              const updatedPayload = {
                ...baseEvent,
                recurrence: {
                  rule: ["RRULE:FREQ=WEEKLY;COUNT=3"],
                  eventId: baseEvent.recurrence?.eventId,
                },
              };

              await CompassSyncProcessor.processEvents([
                {
                  payload: updatedPayload,
                  calendar,
                  providerSync: true,
                  applyTo: RecurringEventUpdateScope.THIS_EVENT,
                  status: EventStatus.CONFIRMED,
                },
              ]);

              const { baseEvent: updatedBaseEvent, instances } =
                await testCompassSeries(updatedPayload, 3);

              expect(updatedBaseEvent.recurrence).toEqual(
                updatedPayload.recurrence,
              );

              expect(instances).toHaveLength(3);

              for (const instance of instances) {
                expect(instance.recurrence).toEqual(updatedPayload.recurrence);
              }
            });
          });
        });

        describe("Delete: ", () => {
          it(
            `should delete a ${type} base event and its instances`.toLowerCase(),
            async () => {
              const user = await AuthDriver.googleSignup();
              const calendar = await CalendarDriver.getRandomUserCalendar(
                user._id,
              );
              const isSomeday = type === "Someday";
              const category = isSomeday
                ? Categories_Recurrence.RECURRENCE_BASE_SOMEDAY
                : Categories_Recurrence.RECURRENCE_BASE;
              const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
              const payload = createMockBaseEvent({
                isSomeday,
                calendar: calendar._id,
                recurrence,
              });

              const changes = await CompassSyncProcessor.processEvents([
                {
                  payload,
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
                    user: user._id,
                    id: payload._id,
                    title: payload.title,
                    transition: [null, `${category}_${EventStatus.CONFIRMED}`],
                    category,
                    operation: isSomeday
                      ? "SOMEDAY_SERIES_CREATED"
                      : "SERIES_CREATED",
                  },
                ]),
              );

              const { baseEvent } = await testCompassSeries(payload, 10);

              await CompassSyncProcessor.processEvents([
                {
                  payload: baseEvent,
                  calendar,
                  providerSync: true,
                  applyTo: RecurringEventUpdateScope.THIS_EVENT,
                  status: EventStatus.CANCELLED,
                },
              ]);

              await expect(testCompassSeries(payload, 10)).rejects.toThrow(
                "Invalid input: expected object, received null",
              );
            },
          );
        });
      },
    );
  });
});
