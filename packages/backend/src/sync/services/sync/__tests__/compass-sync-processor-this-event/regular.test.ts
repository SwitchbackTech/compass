import { faker } from "@faker-js/faker";
import { Priorities } from "@core/constants/core.constants";
import {
  CalendarProvider,
  Categories_Recurrence,
  CompassEventStatus,
  CompassThisEvent,
  RecurringEventUpdateScope,
} from "@core/types/event.types";
import { parseCompassEventDate } from "@core/util/event/event.util";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import {
  testCompassEventInGcal,
  testCompassEventNotInGcal,
  testCompassSeries,
  testCompassSeriesInGcal,
  testCompassStandaloneEvent,
} from "@backend/event/classes/compass.event.parser.test.util";
import eventService, { _getGcal } from "@backend/event/services/event.service";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";

describe.each([{ calendarProvider: CalendarProvider.GOOGLE }])(
  `CompassSyncProcessor - $calendarProvider calendar: ${RecurringEventUpdateScope.THIS_EVENT} - Regular Event: `,
  ({ calendarProvider }) => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    describe("Create: ", () => {
      it("should create a someday event", async () => {
        const { user: _user } = await UtilDriver.setupTestUser();
        const user = _user._id.toString();
        const payload = createMockStandaloneEvent({ isSomeday: true, user });

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
              transition: [null, "STANDALONE_SOMEDAY_CONFIRMED"],
              category: Categories_Recurrence.STANDALONE_SOMEDAY,
              operation: "STANDALONE_SOMEDAY_CREATED",
            },
          ]),
        );

        const { standaloneEvent } = await testCompassStandaloneEvent(payload);

        switch (calendarProvider) {
          case CalendarProvider.GOOGLE:
            await testCompassEventNotInGcal(standaloneEvent);
            break;
        }
      });

      it("should create a calendar event", async () => {
        const { user: _user } = await UtilDriver.setupTestUser();
        const user = _user._id.toString();
        const payload = createMockStandaloneEvent({ user });

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
              transition: [null, "STANDALONE_CONFIRMED"],
              category: Categories_Recurrence.STANDALONE,
              operation: "STANDALONE_CREATED",
            },
          ]),
        );

        const { standaloneEvent } = await testCompassStandaloneEvent(payload);

        switch (calendarProvider) {
          case CalendarProvider.GOOGLE:
            await testCompassEventInGcal(standaloneEvent);
            break;
        }
      });
    });

    describe("Update: ", () => {
      describe("Someday: ", () => {
        describe("Basic Edits: ", () => {
          it("should update the title field of an event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: true,
              user,
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
                  transition: [null, "STANDALONE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_CREATED",
                },
              ]),
            );

            const { standaloneEvent } =
              await testCompassStandaloneEvent(payload);

            const updatedPayload = {
              ...standaloneEvent,
              _id: standaloneEvent._id.toString(),
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
                    "STANDALONE_SOMEDAY",
                    "STANDALONE_SOMEDAY_CONFIRMED",
                  ],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_UPDATED",
                },
              ]),
            );

            const { standaloneEvent: updatedStandaloneEvent } =
              await testCompassStandaloneEvent(updatedPayload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(updatedStandaloneEvent);
                break;
            }
          });

          it("should update the description field of an event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: true,
              user,
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
                  transition: [null, "STANDALONE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_CREATED",
                },
              ]),
            );

            const { standaloneEvent } =
              await testCompassStandaloneEvent(payload);

            const updatedPayload = {
              ...standaloneEvent,
              _id: standaloneEvent._id.toString(),
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
                    "STANDALONE_SOMEDAY",
                    "STANDALONE_SOMEDAY_CONFIRMED",
                  ],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_UPDATED",
                },
              ]),
            );

            const { standaloneEvent: updatedStandaloneEvent } =
              await testCompassStandaloneEvent(updatedPayload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(updatedStandaloneEvent);
                break;
            }
          });

          it("should update the priority field of an event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: true,
              user,
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
                  transition: [null, "STANDALONE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_CREATED",
                },
              ]),
            );

            const { standaloneEvent } =
              await testCompassStandaloneEvent(payload);

            const updatedPayload = {
              ...standaloneEvent,
              _id: standaloneEvent._id.toString(),
              priority: Priorities.RELATIONS,
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
                    "STANDALONE_SOMEDAY",
                    "STANDALONE_SOMEDAY_CONFIRMED",
                  ],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_UPDATED",
                },
              ]),
            );

            const { standaloneEvent: updatedStandaloneEvent } =
              await testCompassStandaloneEvent(updatedPayload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(updatedStandaloneEvent);
                break;
            }
          });

          it("should update the startDate field of an event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: true,
              user,
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
                  transition: [null, "STANDALONE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_CREATED",
                },
              ]),
            );

            const { standaloneEvent } =
              await testCompassStandaloneEvent(payload);

            const updatedPayload = {
              ...standaloneEvent,
              _id: standaloneEvent._id.toString(),
              startDate: parseCompassEventDate(standaloneEvent.endDate!)
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
                    "STANDALONE_SOMEDAY",
                    "STANDALONE_SOMEDAY_CONFIRMED",
                  ],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_UPDATED",
                },
              ]),
            );

            const { standaloneEvent: updatedStandaloneEvent } =
              await testCompassStandaloneEvent(updatedPayload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(updatedStandaloneEvent);
                break;
            }
          });

          it("should update the endDate field of an event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: true,
              user,
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
                  transition: [null, "STANDALONE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_CREATED",
                },
              ]),
            );

            // check that event is in db
            const { standaloneEvent } =
              await testCompassStandaloneEvent(payload);

            const updatedPayload = {
              ...standaloneEvent,
              _id: standaloneEvent._id.toString(),
              endDate: parseCompassEventDate(standaloneEvent.endDate!)
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
                    "STANDALONE_SOMEDAY",
                    "STANDALONE_SOMEDAY_CONFIRMED",
                  ],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_UPDATED",
                },
              ]),
            );

            const { standaloneEvent: updatedStandaloneEvent } =
              await testCompassStandaloneEvent(updatedPayload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(updatedStandaloneEvent);
                break;
            }
          });
        });

        describe("Transition Edits: ", () => {
          it("should update the recurrence field of an event - to base event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: true,
              user,
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
                  transition: [null, "STANDALONE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_CREATED",
                },
              ]),
            );

            const { standaloneEvent } =
              await testCompassStandaloneEvent(payload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(standaloneEvent);
                break;
            }

            const updatedPayload = {
              ...standaloneEvent,
              _id: standaloneEvent._id.toString(),
              recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=20"] },
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
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: true,
              user,
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
                  transition: [null, "STANDALONE_SOMEDAY_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_SOMEDAY_CREATED",
                },
              ]),
            );

            const { standaloneEvent: somedayStandaloneEvent } =
              await testCompassStandaloneEvent(payload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(somedayStandaloneEvent);
                break;
            }

            const updatedPayload = {
              ...somedayStandaloneEvent,
              _id: somedayStandaloneEvent._id.toString(),
              isSomeday: false,
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
                  transition: ["STANDALONE_SOMEDAY", "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE_SOMEDAY,
                  operation: "STANDALONE_CREATED",
                },
              ]),
            );

            const { standaloneEvent } =
              await testCompassStandaloneEvent(updatedPayload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventInGcal(standaloneEvent);
                break;
            }
          });
        });
      });

      describe("Calendar: ", () => {
        describe("Basic Edits: ", () => {
          it("should update the title field of an event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: false,
              user,
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
                  transition: [null, "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_CREATED",
                },
              ]),
            );

            const { standaloneEvent } =
              await testCompassStandaloneEvent(payload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(standaloneEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");

                break;
              }
            }

            const updatedPayload = {
              ...standaloneEvent,
              _id: standaloneEvent._id.toString(),
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
                  transition: ["STANDALONE", "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_UPDATED",
                },
              ]),
            );

            const { standaloneEvent: updatedEvent } =
              await testCompassStandaloneEvent(updatedPayload);

            expect(updatedEvent).not.toHaveProperty("recurrence");

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(updatedEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");

                break;
              }
            }
          });

          it("should update the description field of an event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: false,
              user,
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
                  transition: [null, "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_CREATED",
                },
              ]),
            );

            const { standaloneEvent } =
              await testCompassStandaloneEvent(payload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(standaloneEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");

                break;
              }
            }

            const updatedPayload = {
              ...standaloneEvent,
              _id: standaloneEvent._id.toString(),
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
                  transition: ["STANDALONE", "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_UPDATED",
                },
              ]),
            );

            const { standaloneEvent: updatedEvent } =
              await testCompassStandaloneEvent(updatedPayload);

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(updatedEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");

                break;
              }
            }
          });

          it("should update the priority field of an event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: false,
              user,
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
                  transition: [null, "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_CREATED",
                },
              ]),
            );

            // check that event is in db
            const { standaloneEvent } =
              await testCompassStandaloneEvent(payload);

            expect(standaloneEvent).not.toHaveProperty("recurrence");

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(standaloneEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");

                break;
              }
            }

            const updatedPayload = {
              ...standaloneEvent,
              _id: standaloneEvent._id.toString(),
              priority: Priorities.RELATIONS,
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
                  transition: ["STANDALONE", "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_UPDATED",
                },
              ]),
            );

            const { standaloneEvent: updatedEvent } =
              await testCompassStandaloneEvent(updatedPayload);

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
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: false,
              user,
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
                  transition: [null, "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_CREATED",
                },
              ]),
            );

            // check that event is in db
            const { standaloneEvent } =
              await testCompassStandaloneEvent(payload);

            expect(standaloneEvent).not.toHaveProperty("recurrence");

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(standaloneEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");
                break;
              }
            }

            const updatedPayload = {
              ...standaloneEvent,
              _id: standaloneEvent._id.toString(),
              startDate: parseCompassEventDate(standaloneEvent.endDate!)
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
                  transition: ["STANDALONE", "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_UPDATED",
                },
              ]),
            );

            const { standaloneEvent: updatedEvent } =
              await testCompassStandaloneEvent(updatedPayload);

            expect(updatedEvent).not.toHaveProperty("recurrence");

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(standaloneEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");
                break;
              }
            }
          });

          it("should update the endDate field of an event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: false,
              user,
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
                  transition: [null, "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_CREATED",
                },
              ]),
            );

            // check that event is in db
            const { standaloneEvent } =
              await testCompassStandaloneEvent(payload);

            expect(standaloneEvent).not.toHaveProperty("recurrence");

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(standaloneEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");

                break;
              }
            }

            const updatedPayload = {
              ...standaloneEvent,
              _id: standaloneEvent._id.toString(),
              endDate: parseCompassEventDate(standaloneEvent.startDate!)
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
                  transition: ["STANDALONE", "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_UPDATED",
                },
              ]),
            );

            const { standaloneEvent: updatedEvent } =
              await testCompassStandaloneEvent(updatedPayload);

            expect(updatedEvent).not.toHaveProperty("recurrence");

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(standaloneEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");
                break;
              }
            }
          });
        });

        describe("Transition Edits: ", () => {
          it("should update the isSomeday(to true) field of an event - to someday event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: false,
              user,
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
                  transition: [null, "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_CREATED",
                },
              ]),
            );

            // check that event is in db
            const { standaloneEvent } =
              await testCompassStandaloneEvent(payload);

            expect(standaloneEvent).not.toHaveProperty("recurrence");

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(standaloneEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");
                break;
              }
            }

            const updatedPayload = {
              ...standaloneEvent,
              _id: standaloneEvent._id.toString(),
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

            const { standaloneEvent: somedayStandaloneEvent } =
              await testCompassStandaloneEvent({
                ...updatedEvent,
                _id: updatedEvent!._id.toString(),
              });

            expect(somedayStandaloneEvent).not.toHaveProperty("recurrence");

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE:
                await testCompassEventNotInGcal(somedayStandaloneEvent);
                break;
            }
          });

          it("should update the recurrence(add rule) field of an event - to base event", async () => {
            const { user: _user } = await UtilDriver.setupTestUser();
            const user = _user._id.toString();
            const payload = createMockStandaloneEvent({
              isSomeday: false,
              user,
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
                  transition: [null, "STANDALONE_CONFIRMED"],
                  category: Categories_Recurrence.STANDALONE,
                  operation: "STANDALONE_CREATED",
                },
              ]),
            );

            // check that event is in db
            const { standaloneEvent } =
              await testCompassStandaloneEvent(payload);

            expect(standaloneEvent).not.toHaveProperty("recurrence");

            switch (calendarProvider) {
              case CalendarProvider.GOOGLE: {
                const gcalEvent = await testCompassEventInGcal(standaloneEvent);

                expect(gcalEvent).not.toHaveProperty("recurrence");

                break;
              }
            }

            const updatedPayload = {
              ...standaloneEvent,
              _id: standaloneEvent._id.toString(),
              recurrence: { rule: ["RRULE:FREQ=DAILY;COUNT=5"] },
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
        const { user: _user } = await UtilDriver.setupTestUser();
        const user = _user._id.toString();
        const payload = createMockStandaloneEvent({ isSomeday: true, user });

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
              transition: [null, "STANDALONE_SOMEDAY_CONFIRMED"],
              category: Categories_Recurrence.STANDALONE_SOMEDAY,
              operation: "STANDALONE_SOMEDAY_CREATED",
            },
          ]),
        );

        const { standaloneEvent: somedayStandaloneEvent } =
          await testCompassStandaloneEvent(payload);

        expect(somedayStandaloneEvent).not.toHaveProperty("recurrence");

        switch (calendarProvider) {
          case CalendarProvider.GOOGLE:
            await testCompassEventNotInGcal(somedayStandaloneEvent);
            break;
        }

        const deletePayload = {
          ...somedayStandaloneEvent,
          _id: somedayStandaloneEvent._id.toString(),
        };

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
        const { user: _user } = await UtilDriver.setupTestUser();
        const user = _user._id.toString();
        const payload = createMockStandaloneEvent({ user });

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
              transition: [null, "STANDALONE_CONFIRMED"],
              category: Categories_Recurrence.STANDALONE,
              operation: "STANDALONE_CREATED",
            },
          ]),
        );

        const { standaloneEvent } = await testCompassStandaloneEvent(payload);

        expect(standaloneEvent).not.toHaveProperty("recurrence");

        switch (calendarProvider) {
          case CalendarProvider.GOOGLE:
            await testCompassEventInGcal(standaloneEvent);
            break;
        }

        const deletePayload = {
          ...standaloneEvent,
          _id: standaloneEvent._id.toString(),
        };

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
              _getGcal(deletePayload.user!, deletePayload._id),
            ).rejects.toThrow(`Event with id ${deletePayload._id} not found`);
            break;
        }
      });
    });
  },
);
