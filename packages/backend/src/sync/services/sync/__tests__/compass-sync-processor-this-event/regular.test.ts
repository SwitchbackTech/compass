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
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { EventDriver } from "@backend/__tests__/drivers/event.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import {
  testCompassEventInGcal,
  testCompassEventNotInGcal,
  testCompassRegularEvent,
  testCompassSeries,
  testCompassSeriesInGcal,
} from "@backend/event/classes/compass.event.parser.test.util";
import eventService from "@backend/event/services/event.service";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";
import { UserDriver } from "../../../../../__tests__/drivers/user.driver";

describe.each([{ calendarProvider: CalendarProvider.GOOGLE }])(
  `CompassSyncProcessor - $calendarProvider calendar: ${RecurringEventUpdateScope.THIS_EVENT} - Regular Event: `,
  ({ calendarProvider }) => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    describe("Create: ", () => {
      it("should create a someday event", async () => {
        const _user = await UserDriver.createGoogleAuthUser();
        const user = _user._id.toString();
        const payload = createMockStandaloneEvent({ isSomeday: true, user });

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
              transition: [null, "STANDALONE_SOMEDAY_CONFIRMED"],
              category: Categories_Recurrence.STANDALONE_SOMEDAY,
              operation: "STANDALONE_SOMEDAY_CREATED",
            },
          ]),
        );

        const { regularEvent } = await testCompassRegularEvent(payload);

        switch (calendarProvider) {
          case CalendarProvider.GOOGLE:
            await testCompassEventNotInGcal(regularEvent);
            break;
        }
      });

      it("should create a calendar event", async () => {
        const _user = await UserDriver.createGoogleAuthUser();
        const user = _user._id.toString();
        const payload = createMockStandaloneEvent({ user });

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
              transition: [null, "STANDALONE_CONFIRMED"],
              category: Categories_Recurrence.STANDALONE,
              operation: "STANDALONE_CREATED",
            },
          ]),
        );

        const { regularEvent } = await testCompassRegularEvent(payload);

        switch (calendarProvider) {
          case CalendarProvider.GOOGLE:
            await testCompassEventInGcal(regularEvent);
            break;
        }
      });
    });

    describe("Update: ", () => {
      describe("Someday: ", () => {
        describe("Basic Edits: ", () => {
          it("should update the title field of an event", async () => {
            const _user = await UserDriver.createGoogleAuthUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: true,
              user,
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
                  transition: [null, "STANDALONE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_CREATED",
                },
              ]),
            );

            const { regularEvent } = await testCompassRegularEvent(payload);

            const updatedPayload = {
              ...regularEvent,
              _id: regularEvent._id.toString(),
              title: faker.lorem.sentence(3),
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as ThisEventUpdate["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: [
                    "STANDALONE_SOMEDAY",
                    "STANDALONE_SOMEDAY_CONFIRMED",
                  ],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_UPDATED",
                },
              ]),
            );

            const { regularEvent: updatedRegularEvent } =
              await testCompassRegularEvent(updatedPayload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(updatedRegularEvent);
                break;
            }
          });

          it("should update the description field of an event", async () => {
            const _user = await UserDriver.createGoogleAuthUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: true,
              user,
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
                  transition: [null, "STANDALONE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_CREATED",
                },
              ]),
            );

            const { regularEvent } = await testCompassRegularEvent(payload);

            const updatedPayload = {
              ...regularEvent,
              _id: regularEvent._id.toString(),
              description: faker.lorem.sentence(3),
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as ThisEventUpdate["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: [
                    "STANDALONE_SOMEDAY",
                    "STANDALONE_SOMEDAY_CONFIRMED",
                  ],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_UPDATED",
                },
              ]),
            );

            const { regularEvent: updatedRegularEvent } =
              await testCompassRegularEvent(updatedPayload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(updatedRegularEvent);
                break;
            }
          });

          it("should update the priority field of an event", async () => {
            const _user = await UserDriver.createGoogleAuthUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: true,
              user,
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
                  transition: [null, "STANDALONE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_CREATED",
                },
              ]),
            );

            const { regularEvent } = await testCompassRegularEvent(payload);

            const updatedPayload = {
              ...regularEvent,
              _id: regularEvent._id.toString(),
              priority: Priorities.RELATIONS,
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as ThisEventUpdate["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: [
                    "STANDALONE_SOMEDAY",
                    "STANDALONE_SOMEDAY_CONFIRMED",
                  ],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_UPDATED",
                },
              ]),
            );

            const { regularEvent: updatedRegularEvent } =
              await testCompassRegularEvent(updatedPayload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(updatedRegularEvent);
                break;
            }
          });

          it("should update the startDate field of an event", async () => {
            const _user = await UserDriver.createGoogleAuthUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: true,
              user,
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
                  transition: [null, "STANDALONE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_CREATED",
                },
              ]),
            );

            const { regularEvent } = await testCompassRegularEvent(payload);

            const updatedPayload = {
              ...regularEvent,
              _id: regularEvent._id.toString(),
              startDate: dayjs(regularEvent.endDate)
                .subtract(2, "hours")
                .toISOString(),
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                user: _user._id,
                payload: updatedPayload,
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: [
                    "STANDALONE_SOMEDAY",
                    "STANDALONE_SOMEDAY_CONFIRMED",
                  ],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_UPDATED",
                },
              ]),
            );

            const { regularEvent: updatedRegularEvent } =
              await testCompassRegularEvent(updatedPayload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(updatedRegularEvent);
                break;
            }
          });

          it("should update the endDate field of an event", async () => {
            const _user = await UserDriver.createGoogleAuthUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: true,
              user,
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
                  transition: [null, "STANDALONE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_CREATED",
                },
              ]),
            );

            // check that event is in db
            const { regularEvent } = await testCompassRegularEvent(payload);

            const updatedPayload = {
              ...regularEvent,
              _id: regularEvent._id.toString(),
              endDate: dayjs(regularEvent.endDate).add(2, "hours").toDate(),
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as ThisEventUpdate["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: [
                    "STANDALONE_SOMEDAY",
                    "STANDALONE_SOMEDAY_CONFIRMED",
                  ],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_UPDATED",
                },
              ]),
            );

            const { regularEvent: updatedRegularEvent } =
              await testCompassRegularEvent(updatedPayload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(updatedRegularEvent);
                break;
            }
          });
        });

        describe("Transition Edits: ", () => {
          it("should update the recurrence field of an event - to base event", async () => {
            const _user = await UserDriver.createGoogleAuthUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: true,
              user,
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
                  transition: [null, "STANDALONE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_CREATED",
                },
              ]),
            );

            const { regularEvent } = await testCompassRegularEvent(payload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(regularEvent);
                break;
            }

            const updatedPayload = {
              ...regularEvent,
              _id: regularEvent._id.toString(),
              recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=20"] },
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as ThisEventUpdate["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: [
                    "STANDALONE_SOMEDAY",
                    "RECURRENCE_BASE_SOMEDAY_CONFIRMED",
                  ],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_UPDATED",
                },
              ]),
            );

            const { baseEvent } = await testCompassSeries(updatedPayload, 20);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(baseEvent);
                break;
            }
          });

          it("should update the isSomeday(false) field of an event - to calendar event", async () => {
            const _user = await UserDriver.createGoogleAuthUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: true,
              user,
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
                  transition: [null, "STANDALONE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_CREATED",
                },
              ]),
            );

            const { regularEvent: somedayRegularEvent } =
              await testCompassRegularEvent(payload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(somedayRegularEvent);
                break;
            }

            const updatedPayload = {
              ...somedayRegularEvent,
              _id: somedayRegularEvent._id.toString(),
              isSomeday: false,
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as ThisEventUpdate["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: ["STANDALONE_SOMEDAY", "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_CREATED",
                },
              ]),
            );

            const { regularEvent } =
              await testCompassRegularEvent(updatedPayload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventInGcal(regularEvent);
                break;
            }
          });
        });
      });

      describe("Calendar: ", () => {
        describe("Basic Edits: ", () => {
          it("should update the title field of an event", async () => {
            const _user = await UserDriver.createGoogleAuthUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: false,
              user,
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
                  transition: [null, "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_CREATED",
                },
              ]),
            );

            const { regularEvent } = await testCompassRegularEvent(payload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(regularEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");

                break;
              }
            }

            const updatedPayload = {
              ...regularEvent,
              _id: regularEvent._id.toString(),
              title: faker.lorem.sentence(3),
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as ThisEventUpdate["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: ["STANDALONE", "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_UPDATED",
                },
              ]),
            );

            const { regularEvent: updatedRegularEvent } =
              await testCompassRegularEvent(updatedPayload);

            expect(updatedRegularEvent).not.toHaveProperty("recurrence");

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent =
                  await testCompassEventInGcal(updatedRegularEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");

                break;
              }
            }
          });

          it("should update the description field of an event", async () => {
            const _user = await UserDriver.createGoogleAuthUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: false,
              user,
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
                  transition: [null, "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_CREATED",
                },
              ]),
            );

            const { regularEvent } = await testCompassRegularEvent(payload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(regularEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");

                break;
              }
            }

            const updatedPayload = {
              ...regularEvent,
              _id: regularEvent._id.toString(),
              description: faker.lorem.sentence(3),
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as ThisEventUpdate["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: ["STANDALONE", "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_UPDATED",
                },
              ]),
            );

            const { regularEvent: updatedEvent } =
              await testCompassRegularEvent(updatedPayload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(updatedEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");

                break;
              }
            }
          });

          it("should update the priority field of an event", async () => {
            const _user = await UserDriver.createGoogleAuthUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: false,
              user,
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
                  transition: [null, "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_CREATED",
                },
              ]),
            );

            // check that event is in db
            const { regularEvent } = await testCompassRegularEvent(payload);

            expect(regularEvent).not.toHaveProperty("recurrence");

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(regularEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");

                break;
              }
            }

            const updatedPayload = {
              ...regularEvent,
              _id: regularEvent._id.toString(),
              priority: Priorities.RELATIONS,
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as ThisEventUpdate["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: ["STANDALONE", "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_UPDATED",
                },
              ]),
            );

            const { regularEvent: updatedEvent } =
              await testCompassRegularEvent(updatedPayload);

            expect(updatedEvent).not.toHaveProperty("recurrence");

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(updatedEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");

                break;
              }
            }
          });

          it("should update the startDate field of an event", async () => {
            const _user = await UserDriver.createGoogleAuthUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: false,
              user,
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
                  transition: [null, "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_CREATED",
                },
              ]),
            );

            // check that event is in db
            const { regularEvent } = await testCompassRegularEvent(payload);

            expect(regularEvent).not.toHaveProperty("recurrence");

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(regularEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");
                break;
              }
            }

            const updatedPayload = {
              ...regularEvent,
              _id: regularEvent._id.toString(),
              startDate: dayjs(regularEvent.endDate)
                .subtract(2, "hours")
                .toDate(),
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as ThisEventUpdate["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: ["STANDALONE", "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_UPDATED",
                },
              ]),
            );

            const { regularEvent: updatedEvent } =
              await testCompassRegularEvent(updatedPayload);

            expect(updatedEvent).not.toHaveProperty("recurrence");

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(updatedEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");
                break;
              }
            }
          });

          it("should update the endDate field of an event", async () => {
            const _user = await UserDriver.createGoogleAuthUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: false,
              user,
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
                  transition: [null, "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_CREATED",
                },
              ]),
            );

            // check that event is in db
            const { regularEvent } = await testCompassRegularEvent(payload);

            expect(regularEvent).not.toHaveProperty("recurrence");

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(regularEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");

                break;
              }
            }

            const updatedPayload = {
              ...regularEvent,
              _id: regularEvent._id.toString(),
              endDate: dayjs(regularEvent.startDate).add(2, "hours").toDate(),
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as ThisEventUpdate["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: ["STANDALONE", "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_UPDATED",
                },
              ]),
            );

            const { regularEvent: updatedEvent } =
              await testCompassRegularEvent(updatedPayload);

            expect(updatedEvent).not.toHaveProperty("recurrence");

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(updatedEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");
                break;
              }
            }
          });
        });

        describe("Transition Edits: ", () => {
          it("should update the isSomeday(to true) field of an event - to someday event", async () => {
            const _user = await UserDriver.createGoogleAuthUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: false,
              user,
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
                  transition: [null, "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_CREATED",
                },
              ]),
            );

            // check that event is in db
            const { regularEvent } = await testCompassRegularEvent(payload);

            expect(regularEvent).not.toHaveProperty("recurrence");

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(regularEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");
                break;
              }
            }

            const updatedPayload = {
              ...regularEvent,
              _id: regularEvent._id.toString(),
              isSomeday: true,
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as ThisEventUpdate["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: ["STANDALONE", "STANDALONE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_UPDATED",
                },
              ]),
            );

            // id has changed - we do not transition to the same id
            const updatedEvent = await mongoService.event.findOne({
              user,
              title: updatedPayload.title,
            });

            const { regularEvent: somedayRegularEvent } =
              await testCompassRegularEvent({
                ...updatedEvent,
                _id: updatedEvent!._id.toString(),
              });

            expect(somedayRegularEvent).not.toHaveProperty("recurrence");

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(somedayRegularEvent);
                break;
            }
          });

          it("should update the recurrence(add rule) field of an event - to base event", async () => {
            const _user = await UserDriver.createGoogleAuthUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: false,
              user,
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
                  transition: [null, "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_CREATED",
                },
              ]),
            );

            // check that event is in db
            const { regularEvent } = await testCompassRegularEvent(payload);

            expect(regularEvent).not.toHaveProperty("recurrence");

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(regularEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");

                break;
              }
            }

            const updatedPayload = {
              ...regularEvent,
              _id: regularEvent._id.toString(),
              recurrence: { rule: ["RRULE:FREQ=DAILY;COUNT=5"] },
            };

            const updateChanges = await CompassSyncProcessor.processEvents([
              {
                payload: updatedPayload as ThisEventUpdate["payload"],
                applyTo: RecurringEventUpdateScope.THIS_EVENT,
                status: EventStatus.CONFIRMED,
              },
            ]);

            expect(updateChanges).toEqual(
              expect.arrayContaining([
                {
                  title: updatedPayload.title,
                  transition: ["STANDALONE", "RECURRENCE_BASE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_UPDATED",
                },
              ]),
            );

            const { baseEvent, instances } = await testCompassSeries(
              updatedPayload,
              5,
            );

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassSeriesInGcal(baseEvent!, instances);
                break;
            }
          });
        });
      });
    });

    describe("Delete: ", () => {
      it("should delete a someday event", async () => {
        const _user = await UserDriver.createGoogleAuthUser();
        const user = _user._id.toString();
        const payload = createMockStandaloneEvent({ isSomeday: true, user });

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
              transition: [null, "STANDALONE_SOMEDAY_CONFIRMED"],
              category: Categories_Recurrence.STANDALONE_SOMEDAY,
              operation: "STANDALONE_SOMEDAY_CREATED",
            },
          ]),
        );

        const { regularEvent: somedayRegularEvent } =
          await testCompassRegularEvent(payload);

        expect(somedayRegularEvent).not.toHaveProperty("recurrence");

        switch (calendarProvider) {
          case CalendarProvider.GOOGLE:
            await testCompassEventNotInGcal(somedayRegularEvent);
            break;
        }

        const deletePayload = {
          ...somedayRegularEvent,
          _id: somedayRegularEvent._id.toString(),
        };

        const deleteChanges = await CompassSyncProcessor.processEvents([
          {
            payload: deletePayload as ThisEventUpdate["payload"],
            applyTo: RecurringEventUpdateScope.THIS_EVENT,
            status: EventStatus.CANCELLED,
          },
        ]);

        expect(deleteChanges).toEqual(
          expect.arrayContaining([
            {
              title: deletePayload.title,
              transition: [
                "STANDALONE_SOMEDAY",
                "STANDALONE_SOMEDAY_CANCELLED",
              ],
              category: Categories_Recurrence.STANDALONE_SOMEDAY,
              operation: "STANDALONE_SOMEDAY_DELETED",
            },
          ]),
        );

        // check that event is deleted in db
        await expect(
          eventService.readById(user, deletePayload._id),
        ).rejects.toThrow();
      });

      it("should delete a calendar event", async () => {
        const _user = await UserDriver.createGoogleAuthUser();
        const user = _user._id.toString();
        const payload = createMockStandaloneEvent({ user });

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
              transition: [null, "STANDALONE_CONFIRMED"],
              category: Categories_Recurrence.STANDALONE,
              operation: "STANDALONE_CREATED",
            },
          ]),
        );

        const { regularEvent } = await testCompassRegularEvent(payload);

        expect(regularEvent).not.toHaveProperty("recurrence");

        switch (calendarProvider) {
          case CalendarProvider.GOOGLE:
            await testCompassEventInGcal(regularEvent);
            break;
        }

        const deletePayload = {
          ...regularEvent,
          _id: regularEvent._id.toString(),
        };

        const deleteChanges = await CompassSyncProcessor.processEvents([
          {
            payload: deletePayload as ThisEventUpdate["payload"],
            applyTo: RecurringEventUpdateScope.THIS_EVENT,
            status: EventStatus.CANCELLED,
          },
        ]);

        expect(deleteChanges).toEqual(
          expect.arrayContaining([
            {
              title: deletePayload.title,
              transition: ["STANDALONE", "STANDALONE_CANCELLED"],
              category: Categories_Recurrence.STANDALONE,
              operation: "STANDALONE_DELETED",
            },
          ]),
        );

        // check that event is deleted in db
        await expect(
          eventService.readById(user, deletePayload._id),
        ).rejects.toThrow();

        switch (calendarProvider) {
          case CalendarProvider.GOOGLE:
            await expect(
              EventDriver.getGCalEvent(deletePayload.user!, deletePayload._id),
            ).rejects.toThrow(`Event with id ${deletePayload._id} not found`);
            break;
        }
      });
    });
  },
);
