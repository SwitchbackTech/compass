import { faker } from "@faker-js/faker";
import { Priorities } from "@core/constants/core.constants";
import {
  CalendarProvider,
  Categories_Recurrence,
  CompassEventStatus,
  CompassThisEvent,
  RecurringEventUpdateScope,
  Schema_Event,
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
import {
  testCompassEventNotInGcal,
  testCompassSeries,
  testCompassSeriesInGcal,
  testCompassStandaloneEvent,
} from "@backend/event/classes/compass.event.parser.test.util";
import eventService from "@backend/event/services/event.service";
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

        const { baseEvent } = await testCompassSeries(payload);

        switch (calendarProvider) {
          case CalendarProvider.GOOGLE:
            await testCompassEventNotInGcal(baseEvent);
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
      describe("Someday: ", () => {
        describe("Basic Edits: ", () => {
          it("should update the title field of an event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const isSomeday = true;
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
                  transition: [null, "RECURRENCE_BASE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.RECURRENCE_BASE_SOMEDAY,
                  operation: "RECURRENCE_BASE_SOMEDAY_CREATED",
                },
              ]),
            );

            const { baseEvent } = await testCompassSeries(payload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(baseEvent);
                break;
            }

            const updatedPayload = {
              ...baseEvent,
              _id: baseEvent._id.toString(),
              title: faker.lorem.sentence(3),
            } as WithCompassId<Schema_Event_Recur_Base>;

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
                    "RECURRENCE_BASE_SOMEDAY",
                    "RECURRENCE_BASE_SOMEDAY_CONFIRMED",
                  ],
                  category: Categories_Recurrence.RECURRENCE_BASE_SOMEDAY,
                  operation: "RECURRENCE_BASE_SOMEDAY_UPDATED",
                },
              ]),
            );

            const { baseEvent: updatedEvent } =
              await testCompassSeries(updatedPayload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(updatedEvent);
                break;
            }
          });

          it("should update the description field of an event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const isSomeday = true;
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
                  transition: [null, "RECURRENCE_BASE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.RECURRENCE_BASE_SOMEDAY,
                  operation: "RECURRENCE_BASE_SOMEDAY_CREATED",
                },
              ]),
            );

            const { baseEvent } = await testCompassSeries(payload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(baseEvent);
                break;
            }

            const updatedPayload = {
              ...baseEvent,
              _id: baseEvent._id.toString(),
              description: faker.lorem.sentence(3),
            } as WithCompassId<Schema_Event_Recur_Base>;

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
                    "RECURRENCE_BASE_SOMEDAY",
                    "RECURRENCE_BASE_SOMEDAY_CONFIRMED",
                  ],
                  category: Categories_Recurrence.RECURRENCE_BASE_SOMEDAY,
                  operation: "RECURRENCE_BASE_SOMEDAY_UPDATED",
                },
              ]),
            );

            const { baseEvent: updatedEvent } =
              await testCompassSeries(updatedPayload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(updatedEvent);
                break;
            }
          });

          it("should update the priority field of an event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const isSomeday = true;
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
                  transition: [null, "RECURRENCE_BASE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.RECURRENCE_BASE_SOMEDAY,
                  operation: "RECURRENCE_BASE_SOMEDAY_CREATED",
                },
              ]),
            );

            const { baseEvent } = await testCompassSeries(payload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(baseEvent);
                break;
            }

            const updatedPayload = {
              ...baseEvent,
              _id: baseEvent._id.toString(),
              priority: Priorities.RELATIONS,
            } as WithCompassId<Schema_Event_Recur_Base>;

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
                    "RECURRENCE_BASE_SOMEDAY",
                    "RECURRENCE_BASE_SOMEDAY_CONFIRMED",
                  ],
                  category: Categories_Recurrence.RECURRENCE_BASE_SOMEDAY,
                  operation: "RECURRENCE_BASE_SOMEDAY_UPDATED",
                },
              ]),
            );

            const { baseEvent: updatedEvent } =
              await testCompassSeries(updatedPayload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(updatedEvent);
                break;
            }
          });

          it("should update the startDate field of an event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const isSomeday = true;
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
                  transition: [null, "RECURRENCE_BASE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.RECURRENCE_BASE_SOMEDAY,
                  operation: "RECURRENCE_BASE_SOMEDAY_CREATED",
                },
              ]),
            );

            const { baseEvent } = await testCompassSeries(payload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(baseEvent);
                break;
            }

            const updatedPayload = {
              ...baseEvent,
              _id: baseEvent._id.toString(),
              startDate: parseCompassEventDate(baseEvent.endDate!)
                .subtract(2, "hours")
                .toISOString(),
            } as WithCompassId<Schema_Event_Recur_Base>;

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
                    "RECURRENCE_BASE_SOMEDAY",
                    "RECURRENCE_BASE_SOMEDAY_CONFIRMED",
                  ],
                  category: Categories_Recurrence.RECURRENCE_BASE_SOMEDAY,
                  operation: "RECURRENCE_BASE_SOMEDAY_UPDATED",
                },
              ]),
            );

            const { baseEvent: updatedEvent } =
              await testCompassSeries(updatedPayload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(updatedEvent);
                break;
            }
          });

          it("should update the endDate field of an event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const isSomeday = true;
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
                  transition: [null, "RECURRENCE_BASE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.RECURRENCE_BASE_SOMEDAY,
                  operation: "RECURRENCE_BASE_SOMEDAY_CREATED",
                },
              ]),
            );

            const { baseEvent } = await testCompassSeries(payload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(baseEvent);
                break;
            }

            const updatedPayload = {
              ...baseEvent,
              _id: baseEvent._id.toString(),
              endDate: parseCompassEventDate(baseEvent.startDate!)
                .add(2, "hours")
                .toISOString(),
            } as WithCompassId<Schema_Event_Recur_Base>;

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
                    "RECURRENCE_BASE_SOMEDAY",
                    "RECURRENCE_BASE_SOMEDAY_CONFIRMED",
                  ],
                  category: Categories_Recurrence.RECURRENCE_BASE_SOMEDAY,
                  operation: "RECURRENCE_BASE_SOMEDAY_UPDATED",
                },
              ]),
            );

            const { baseEvent: updatedEvent } =
              await testCompassSeries(updatedPayload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(updatedEvent);
                break;
            }
          });

          it("should update the recurrence field of an event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const isSomeday = true;
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
                  transition: [null, "RECURRENCE_BASE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.RECURRENCE_BASE_SOMEDAY,
                  operation: "RECURRENCE_BASE_SOMEDAY_CREATED",
                },
              ]),
            );

            const { baseEvent } = await testCompassSeries(payload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(baseEvent);
                break;
            }

            const updatedPayload = {
              ...baseEvent,
              _id: baseEvent._id.toString(),
              recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
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
                    "RECURRENCE_BASE_SOMEDAY",
                    "RECURRENCE_BASE_SOMEDAY_CONFIRMED",
                  ],
                  category: Categories_Recurrence.RECURRENCE_BASE_SOMEDAY,
                  operation: "RECURRENCE_BASE_SOMEDAY_UPDATED",
                },
              ]),
            );

            const { baseEvent: updatedEvent } =
              await testCompassSeries(updatedPayload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(updatedEvent);
                break;
            }
          });
        });

        describe("Transition Edits: ", () => {
          it("should update the recurrence(to null) field of an event - to regular someday event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const isSomeday = true;
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
                  transition: [null, "RECURRENCE_BASE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.RECURRENCE_BASE_SOMEDAY,
                  operation: "RECURRENCE_BASE_SOMEDAY_CREATED",
                },
              ]),
            );

            const { baseEvent } = await testCompassSeries(payload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(baseEvent);
                break;
            }

            const updatedPayload = {
              ...baseEvent,
              _id: baseEvent._id.toString(),
              recurrence: { rule: null },
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
                    "RECURRENCE_BASE_SOMEDAY",
                    "STANDALONE_SOMEDAY_CONFIRMED",
                  ],
                  category: Categories_Recurrence.RECURRENCE_BASE_SOMEDAY,
                  operation: "RECURRENCE_BASE_SOMEDAY_UPDATED",
                },
              ]),
            );

            delete (updatedPayload as unknown as Schema_Event).recurrence;

            const { standaloneEvent } =
              await testCompassStandaloneEvent(updatedPayload);

            expect(standaloneEvent).not.toHaveProperty("recurrence");

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(standaloneEvent);
                break;
            }
          });

          it("should update the isSomeday(false) field of an event - to calendar event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const isSomeday = true;
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
                  transition: [null, "RECURRENCE_BASE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.RECURRENCE_BASE_SOMEDAY,
                  operation: "RECURRENCE_BASE_SOMEDAY_CREATED",
                },
              ]),
            );

            const { baseEvent } = await testCompassSeries(payload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(baseEvent);
                break;
            }

            const updatedPayload = {
              ...baseEvent,
              _id: baseEvent._id.toString(),
              isSomeday: false,
            } as WithCompassId<Schema_Event_Recur_Base>;

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
                    "RECURRENCE_BASE_SOMEDAY",
                    "RECURRENCE_BASE_CONFIRMED",
                  ],
                  category: Categories_Recurrence.RECURRENCE_BASE_SOMEDAY,
                  operation: "RECURRENCE_BASE_CREATED",
                },
              ]),
            );

            const { baseEvent: updatedEvent, instances } =
              await testCompassSeries(updatedPayload, 10);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassSeriesInGcal(updatedEvent!, instances);
                break;
            }
          });
        });
      });
    });

    describe("Delete: ", () => {
      it("should delete a someday event", async () => {
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

        const { baseEvent } = await testCompassSeries(payload);

        switch (calendarProvider) {
          case CalendarProvider.GOOGLE:
            await testCompassEventNotInGcal(baseEvent);
            break;
        }

        const deletePayload = {
          ...baseEvent,
          _id: baseEvent._id.toString(),
        } as WithCompassId<Schema_Event_Recur_Base>;

        const deleteChanges = await CompassSyncProcessor.processEvents([
          {
            payload: deletePayload as CompassThisEvent["payload"],
            applyTo: RecurringEventUpdateScope.THIS_EVENT,
            status: CompassEventStatus.CANCELLED,
          },
        ]);

        expect(deleteChanges).toEqual(
          expect.arrayContaining([
            {
              title: deletePayload.title,
              transition: [
                "RECURRENCE_BASE_SOMEDAY",
                "RECURRENCE_BASE_SOMEDAY_CANCELLED",
              ],
              category: Categories_Recurrence.RECURRENCE_BASE_SOMEDAY,
              operation: "RECURRENCE_BASE_SOMEDAY_DELETED",
            },
          ]),
        );

        // check that event is deleted in db
        await expect(
          eventService.readById(user, payload._id),
        ).rejects.toThrow();
      });
    });
  },
);
