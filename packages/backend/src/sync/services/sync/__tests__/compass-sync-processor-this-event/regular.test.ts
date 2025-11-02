import { faker } from "@faker-js/faker";
import { Priorities } from "@core/constants/core.constants";
import { CalendarProvider } from "@core/types/calendar.types";
import {
  BaseEventSchema,
  Categories_Recurrence,
  EventMetadataSchema,
  EventSchema,
  EventStatus,
  InstanceEventSchema,
  RecurringEventUpdateScope,
  RegularEventSchema,
  TransitionCategoriesRecurrence,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createMockRegularEvent } from "@core/util/test/ccal.event.factory";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import { CalendarDriver } from "@backend/__tests__/drivers/calendar.driver";
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

describe(`CompassSyncProcessor - ${RecurringEventUpdateScope.THIS_EVENT} - Regular Event: `, () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  describe("Create: ", () => {
    it("should create a someday event", async () => {
      const user = await AuthDriver.googleSignup();
      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
      const payload = createMockRegularEvent({
        isSomeday: true,
        calendar: calendar._id,
      });

      const changes = await CompassSyncProcessor.processEvents([
        {
          calendar,
          providerSync: true,
          payload,
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
              TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CONFIRMED,
            ],
            category: Categories_Recurrence.REGULAR_SOMEDAY,
            operation: "REGULAR_SOMEDAY_CREATED",
          },
        ]),
      );

      const { regularEvent } = await testCompassRegularEvent(payload);

      switch (calendar.metadata.provider) {
        case CalendarProvider.GOOGLE:
          await testCompassEventNotInGcal(regularEvent);
          break;
      }
    });

    it("should create a calendar event", async () => {
      const user = await AuthDriver.googleSignup();
      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
      const payload = createMockRegularEvent({ calendar: calendar._id });

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
              TransitionCategoriesRecurrence.REGULAR_CONFIRMED,
            ],
            category: Categories_Recurrence.REGULAR,
            operation: "REGULAR_CREATED",
          },
        ]),
      );

      const { regularEvent } = await testCompassRegularEvent(payload);

      switch (calendar.metadata.provider) {
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
          const user = await AuthDriver.googleSignup();
          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
          const payload = createMockRegularEvent({
            isSomeday: true,
            calendar: calendar._id,
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
                  TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR_SOMEDAY,
                operation: "REGULAR_SOMEDAY_CREATED",
              },
            ]),
          );

          const { regularEvent } = await testCompassRegularEvent(payload);

          const updatedPayload = RegularEventSchema.parse({
            ...regularEvent,
            _id: regularEvent._id,
            title: faker.lorem.sentence(3),
          });

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              payload: updatedPayload,
              calendar,
              providerSync: true,
              applyTo: RecurringEventUpdateScope.THIS_EVENT,
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
                  "REGULAR_SOMEDAY",
                  TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR_SOMEDAY,
                operation: "REGULAR_SOMEDAY_UPDATED",
              },
            ]),
          );

          const { regularEvent: updatedRegularEvent } =
            await testCompassRegularEvent(updatedPayload);

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE:
              await testCompassEventNotInGcal(updatedRegularEvent);
              break;
          }
        });

        it("should update the description field of an event", async () => {
          const user = await AuthDriver.googleSignup();
          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
          const payload = createMockRegularEvent({
            isSomeday: true,
            calendar: calendar._id,
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
                  TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR_SOMEDAY,
                operation: "REGULAR_SOMEDAY_CREATED",
              },
            ]),
          );

          const { regularEvent } = await testCompassRegularEvent(payload);

          const updatedPayload = RegularEventSchema.parse({
            ...regularEvent,
            _id: regularEvent._id,
            description: faker.lorem.sentence(3),
          });

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              payload: updatedPayload,
              calendar,
              providerSync: true,
              applyTo: RecurringEventUpdateScope.THIS_EVENT,
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
                  "REGULAR_SOMEDAY",
                  TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR_SOMEDAY,
                operation: "REGULAR_SOMEDAY_UPDATED",
              },
            ]),
          );

          const { regularEvent: updatedRegularEvent } =
            await testCompassRegularEvent(updatedPayload);

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE:
              await testCompassEventNotInGcal(updatedRegularEvent);
              break;
          }
        });

        it("should update the priority field of an event", async () => {
          const user = await AuthDriver.googleSignup();

          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

          const payload = createMockRegularEvent({
            isSomeday: true,
            calendar: calendar._id,
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
                  TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR_SOMEDAY,
                operation: "REGULAR_SOMEDAY_CREATED",
              },
            ]),
          );

          const { regularEvent } = await testCompassRegularEvent(payload);

          const updatedPayload = RegularEventSchema.parse({
            ...regularEvent,
            _id: regularEvent._id,
            priority: Priorities.RELATIONS,
          });

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              payload: updatedPayload,
              calendar,
              providerSync: true,
              applyTo: RecurringEventUpdateScope.THIS_EVENT,
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
                  "REGULAR_SOMEDAY",
                  TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR_SOMEDAY,
                operation: "REGULAR_SOMEDAY_UPDATED",
              },
            ]),
          );

          const { regularEvent: updatedRegularEvent } =
            await testCompassRegularEvent(updatedPayload);

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE:
              await testCompassEventNotInGcal(updatedRegularEvent);
              break;
          }
        });

        it("should update the startDate field of an event", async () => {
          const user = await AuthDriver.googleSignup();

          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

          const payload = createMockRegularEvent({
            isSomeday: true,
            calendar: calendar._id,
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
                  TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR_SOMEDAY,
                operation: "REGULAR_SOMEDAY_CREATED",
              },
            ]),
          );

          const { regularEvent } = await testCompassRegularEvent(payload);

          const updatedPayload = RegularEventSchema.parse({
            ...regularEvent,
            _id: regularEvent._id,
            startDate: dayjs(regularEvent.endDate)
              .subtract(2, "hours")
              .toDate(),
          });

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              calendar,
              providerSync: true,
              payload: updatedPayload,
              applyTo: RecurringEventUpdateScope.THIS_EVENT,
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
                  "REGULAR_SOMEDAY",
                  TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR_SOMEDAY,
                operation: "REGULAR_SOMEDAY_UPDATED",
              },
            ]),
          );

          const { regularEvent: updatedRegularEvent } =
            await testCompassRegularEvent(updatedPayload);

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE:
              await testCompassEventNotInGcal(updatedRegularEvent);
              break;
          }
        });

        it("should update the endDate field of an event", async () => {
          const user = await AuthDriver.googleSignup();

          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

          const payload = createMockRegularEvent({
            isSomeday: true,
            calendar: calendar._id,
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
                  TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR_SOMEDAY,
                operation: "REGULAR_SOMEDAY_CREATED",
              },
            ]),
          );

          // check that event is in db
          const { regularEvent } = await testCompassRegularEvent(payload);

          const updatedPayload = RegularEventSchema.parse({
            ...regularEvent,
            _id: regularEvent._id,
            endDate: dayjs(regularEvent.endDate).add(2, "hours").toDate(),
          });

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              payload: updatedPayload,
              calendar,
              providerSync: true,
              applyTo: RecurringEventUpdateScope.THIS_EVENT,
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
                  "REGULAR_SOMEDAY",
                  TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR_SOMEDAY,
                operation: "REGULAR_SOMEDAY_UPDATED",
              },
            ]),
          );

          const { regularEvent: updatedRegularEvent } =
            await testCompassRegularEvent(updatedPayload);

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE:
              await testCompassEventNotInGcal(updatedRegularEvent);
              break;
          }
        });
      });

      describe("Transition Edits: ", () => {
        it("should update the recurrence field of an event - to base event", async () => {
          const user = await AuthDriver.googleSignup();

          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

          const payload = createMockRegularEvent({
            isSomeday: true,
            calendar: calendar._id,
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
                  TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR_SOMEDAY,
                operation: "REGULAR_SOMEDAY_CREATED",
              },
            ]),
          );

          const { regularEvent } = await testCompassRegularEvent(payload);

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE:
              await testCompassEventNotInGcal(regularEvent);
              break;
          }

          const updatedPayload = BaseEventSchema.parse({
            ...regularEvent,
            _id: regularEvent._id,
            recurrence: {
              rule: ["RRULE:FREQ=WEEKLY;COUNT=20"],
              eventId: regularEvent._id,
            },
          });

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              payload: updatedPayload,
              calendar,
              providerSync: true,
              applyTo: RecurringEventUpdateScope.THIS_EVENT,
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
                  "REGULAR_SOMEDAY",
                  TransitionCategoriesRecurrence.RECURRENCE_BASE_SOMEDAY_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR_SOMEDAY,
                operation: "REGULAR_SOMEDAY_UPDATED",
              },
            ]),
          );

          const { baseEvent } = await testCompassSeries(updatedPayload, 20);

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE:
              await testCompassEventNotInGcal(baseEvent);
              break;
          }
        });

        it("should update the isSomeday(false) field of an event - to calendar event", async () => {
          const user = await AuthDriver.googleSignup();

          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

          const payload = createMockRegularEvent({
            isSomeday: true,
            calendar: calendar._id,
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
                  TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR_SOMEDAY,
                operation: "REGULAR_SOMEDAY_CREATED",
              },
            ]),
          );

          const { regularEvent: somedayRegularEvent } =
            await testCompassRegularEvent(payload);

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE:
              await testCompassEventNotInGcal(somedayRegularEvent);
              break;
          }

          const updatedPayload = RegularEventSchema.parse({
            ...somedayRegularEvent,
            _id: somedayRegularEvent._id,
            isSomeday: false,
          });

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              payload: updatedPayload,
              calendar,
              providerSync: true,
              applyTo: RecurringEventUpdateScope.THIS_EVENT,
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
                  "REGULAR_SOMEDAY",
                  TransitionCategoriesRecurrence.REGULAR_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR_SOMEDAY,
                operation: "REGULAR_SOMEDAY_CREATED",
              },
            ]),
          );

          const { regularEvent } =
            await testCompassRegularEvent(updatedPayload);

          switch (calendar.metadata.provider) {
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
          const user = await AuthDriver.googleSignup();

          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

          const payload = createMockRegularEvent({
            isSomeday: false,
            calendar: calendar._id,
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
                  TransitionCategoriesRecurrence.REGULAR_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR,
                operation: "REGULAR_CREATED",
              },
            ]),
          );

          const { regularEvent } = await testCompassRegularEvent(payload);

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              const gcalEvent = await testCompassEventInGcal(regularEvent);

              expect(gcalEvent).not.toHaveProperty("recurrence");

              break;
            }
          }

          const updatedPayload = RegularEventSchema.parse({
            ...regularEvent,
            _id: regularEvent._id,
            title: faker.lorem.sentence(3),
          });

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              payload: updatedPayload,
              calendar,
              providerSync: true,
              applyTo: RecurringEventUpdateScope.THIS_EVENT,
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
                  "REGULAR",
                  TransitionCategoriesRecurrence.REGULAR_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR,
                operation: "REGULAR_UPDATED",
              },
            ]),
          );

          const { regularEvent: updatedRegularEvent } =
            await testCompassRegularEvent(updatedPayload);

          expect(updatedRegularEvent).not.toHaveProperty("recurrence");

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              const gcalEvent =
                await testCompassEventInGcal(updatedRegularEvent);

              expect(gcalEvent).not.toHaveProperty("recurrence");

              break;
            }
          }
        });

        it("should update the description field of an event", async () => {
          const user = await AuthDriver.googleSignup();

          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

          const payload = createMockRegularEvent({
            isSomeday: false,
            calendar: calendar._id,
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
                  TransitionCategoriesRecurrence.REGULAR_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR,
                operation: "REGULAR_CREATED",
              },
            ]),
          );

          const { regularEvent } = await testCompassRegularEvent(payload);

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              const gcalEvent = await testCompassEventInGcal(regularEvent);

              expect(gcalEvent).not.toHaveProperty("recurrence");

              break;
            }
          }

          const updatedPayload = RegularEventSchema.parse({
            ...regularEvent,
            _id: regularEvent._id,
            description: faker.lorem.sentence(3),
          });

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              payload: updatedPayload,
              calendar,
              providerSync: true,
              applyTo: RecurringEventUpdateScope.THIS_EVENT,
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
                  "REGULAR",
                  TransitionCategoriesRecurrence.REGULAR_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR,
                operation: "REGULAR_UPDATED",
              },
            ]),
          );

          const { regularEvent: updatedEvent } =
            await testCompassRegularEvent(updatedPayload);

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              const gcalEvent = await testCompassEventInGcal(updatedEvent);

              expect(gcalEvent).not.toHaveProperty("recurrence");

              break;
            }
          }
        });

        it("should update the priority field of an event", async () => {
          const user = await AuthDriver.googleSignup();

          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

          const payload = createMockRegularEvent({
            isSomeday: false,
            calendar: calendar._id,
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
                  TransitionCategoriesRecurrence.REGULAR_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR,
                operation: "REGULAR_CREATED",
              },
            ]),
          );

          // check that event is in db
          const { regularEvent } = await testCompassRegularEvent(payload);

          expect(regularEvent).not.toHaveProperty("recurrence");

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              const gcalEvent = await testCompassEventInGcal(regularEvent);

              expect(gcalEvent).not.toHaveProperty("recurrence");

              break;
            }
          }

          const updatedPayload = RegularEventSchema.parse({
            ...regularEvent,
            _id: regularEvent._id,
            priority: Priorities.RELATIONS,
          });

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              payload: updatedPayload,
              calendar,
              providerSync: true,
              applyTo: RecurringEventUpdateScope.THIS_EVENT,
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
                  "REGULAR",
                  TransitionCategoriesRecurrence.REGULAR_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR,
                operation: "REGULAR_UPDATED",
              },
            ]),
          );

          const { regularEvent: updatedEvent } =
            await testCompassRegularEvent(updatedPayload);

          expect(updatedEvent).not.toHaveProperty("recurrence");

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              const gcalEvent = await testCompassEventInGcal(updatedEvent);

              expect(gcalEvent).not.toHaveProperty("recurrence");

              break;
            }
          }
        });

        it("should update the startDate field of an event", async () => {
          const user = await AuthDriver.googleSignup();

          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

          const payload = createMockRegularEvent({
            isSomeday: false,
            calendar: calendar._id,
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
                  TransitionCategoriesRecurrence.REGULAR_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR,
                operation: "REGULAR_CREATED",
              },
            ]),
          );

          // check that event is in db
          const { regularEvent } = await testCompassRegularEvent(payload);

          expect(regularEvent).not.toHaveProperty("recurrence");

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              const gcalEvent = await testCompassEventInGcal(regularEvent);

              expect(gcalEvent).not.toHaveProperty("recurrence");
              break;
            }
          }

          const updatedPayload = {
            ...regularEvent,
            _id: regularEvent._id,
            startDate: dayjs(regularEvent.endDate)
              .subtract(2, "hours")
              .toDate(),
          };

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              payload: updatedPayload,
              calendar,
              providerSync: true,
              applyTo: RecurringEventUpdateScope.THIS_EVENT,
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
                  "REGULAR",
                  TransitionCategoriesRecurrence.REGULAR_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR,
                operation: "REGULAR_UPDATED",
              },
            ]),
          );

          const { regularEvent: updatedEvent } =
            await testCompassRegularEvent(updatedPayload);

          expect(updatedEvent).not.toHaveProperty("recurrence");

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              const gcalEvent = await testCompassEventInGcal(updatedEvent);

              expect(gcalEvent).not.toHaveProperty("recurrence");
              break;
            }
          }
        });

        it("should update the endDate field of an event", async () => {
          const user = await AuthDriver.googleSignup();

          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

          const payload = createMockRegularEvent({
            isSomeday: false,
            calendar: calendar._id,
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
                  TransitionCategoriesRecurrence.REGULAR_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR,
                operation: "REGULAR_CREATED",
              },
            ]),
          );

          // check that event is in db
          const { regularEvent } = await testCompassRegularEvent(payload);

          expect(regularEvent).not.toHaveProperty("recurrence");

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              const gcalEvent = await testCompassEventInGcal(regularEvent);

              expect(gcalEvent).not.toHaveProperty("recurrence");

              break;
            }
          }

          const updatedPayload = {
            ...regularEvent,
            _id: regularEvent._id,
            endDate: dayjs(regularEvent.startDate).add(2, "hours").toDate(),
          };

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              payload: updatedPayload,
              calendar,
              providerSync: true,
              applyTo: RecurringEventUpdateScope.THIS_EVENT,
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
                  "REGULAR",
                  TransitionCategoriesRecurrence.REGULAR_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR,
                operation: "REGULAR_UPDATED",
              },
            ]),
          );

          const { regularEvent: updatedEvent } =
            await testCompassRegularEvent(updatedPayload);

          expect(updatedEvent).not.toHaveProperty("recurrence");

          switch (calendar.metadata.provider) {
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
          const user = await AuthDriver.googleSignup();

          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

          const payload = createMockRegularEvent({
            isSomeday: false,
            calendar: calendar._id,
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
                  TransitionCategoriesRecurrence.REGULAR_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR,
                operation: "REGULAR_CREATED",
              },
            ]),
          );

          // check that event is in db
          const { regularEvent } = await testCompassRegularEvent(payload);

          expect(regularEvent).not.toHaveProperty("recurrence");

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              const gcalEvent = await testCompassEventInGcal(regularEvent);

              expect(gcalEvent).not.toHaveProperty("recurrence");
              break;
            }
          }

          const updatedPayload = {
            ...regularEvent,
            _id: regularEvent._id,
            isSomeday: true,
          };

          Reflect.deleteProperty(updatedPayload, "metadata");

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              payload: updatedPayload,
              calendar,
              providerSync: true,
              applyTo: RecurringEventUpdateScope.THIS_EVENT,
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
                  "REGULAR",
                  TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR,
                operation: "REGULAR_UPDATED",
              },
            ]),
          );

          // id has changed - we do not transition to the same id
          const updatedEvent = await mongoService.event.findOne({
            calendar: calendar._id,
            title: updatedPayload.title,
          });

          expect(updatedEvent).toBeDefined();
          expect(updatedEvent).not.toBeNull();

          const { regularEvent: somedayRegularEvent } =
            await testCompassRegularEvent(EventSchema.parse(updatedEvent));

          expect(somedayRegularEvent).not.toHaveProperty("recurrence");

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE:
              await testCompassEventNotInGcal(somedayRegularEvent);
              break;
          }
        });

        it("should update the recurrence(add rule) field of an event - convert to base event", async () => {
          const user = await AuthDriver.googleSignup();

          const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

          const payload = createMockRegularEvent({
            isSomeday: false,
            calendar: calendar._id,
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
                  TransitionCategoriesRecurrence.REGULAR_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR,
                operation: "REGULAR_CREATED",
              },
            ]),
          );

          // check that event is in db
          const { regularEvent } = await testCompassRegularEvent(payload);

          expect(regularEvent).not.toHaveProperty("recurrence");

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE: {
              const gcalEvent = await testCompassEventInGcal(regularEvent);

              expect(gcalEvent).not.toHaveProperty("recurrence");

              break;
            }
          }

          const updatedPayload = BaseEventSchema.parse({
            ...regularEvent,
            _id: regularEvent._id,
            recurrence: {
              rule: ["RRULE:FREQ=DAILY;COUNT=5"],
              eventId: regularEvent._id,
            },
          });

          const updateChanges = await CompassSyncProcessor.processEvents([
            {
              payload: updatedPayload,
              calendar,
              providerSync: true,
              applyTo: RecurringEventUpdateScope.THIS_EVENT,
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
                  "REGULAR",
                  TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
                ],
                category: Categories_Recurrence.REGULAR,
                operation: "REGULAR_UPDATED",
              },
            ]),
          );

          const { baseEvent, instances } = await testCompassSeries(
            updatedPayload,
            5,
          );

          switch (calendar.metadata.provider) {
            case CalendarProvider.GOOGLE:
              await testCompassSeriesInGcal(
                baseEvent,
                InstanceEventSchema.array().parse(instances),
              );
              break;
          }
        });
      });
    });
  });

  describe("Delete: ", () => {
    it("should delete a someday event", async () => {
      const user = await AuthDriver.googleSignup();

      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

      const payload = createMockRegularEvent({
        isSomeday: true,
        calendar: calendar._id,
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
              TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CONFIRMED,
            ],
            category: Categories_Recurrence.REGULAR_SOMEDAY,
            operation: "REGULAR_SOMEDAY_CREATED",
          },
        ]),
      );

      const { regularEvent: somedayRegularEvent } =
        await testCompassRegularEvent(payload);

      expect(somedayRegularEvent).not.toHaveProperty("recurrence");

      switch (calendar.metadata.provider) {
        case CalendarProvider.GOOGLE:
          await testCompassEventNotInGcal(somedayRegularEvent);
          break;
      }

      const deletePayload = {
        ...somedayRegularEvent,
        _id: somedayRegularEvent._id,
      };

      const deleteChanges = await CompassSyncProcessor.processEvents([
        {
          payload: deletePayload,
          calendar,
          providerSync: true,
          applyTo: RecurringEventUpdateScope.THIS_EVENT,
          status: EventStatus.CANCELLED,
        },
      ]);

      expect(deleteChanges).toEqual(
        expect.arrayContaining([
          {
            calendar: calendar._id,
            user: user._id,
            id: payload._id,
            title: deletePayload.title,
            transition: [
              "REGULAR_SOMEDAY",
              TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CANCELLED,
            ],
            category: Categories_Recurrence.REGULAR_SOMEDAY,
            operation: "REGULAR_SOMEDAY_DELETED",
          },
        ]),
      );

      // check that event is deleted in db
      await expect(
        eventService.readById(calendar._id, deletePayload._id),
      ).rejects.toThrow();
    });

    it("should delete a calendar event", async () => {
      const user = await AuthDriver.googleSignup();

      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

      const payload = createMockRegularEvent({ calendar: calendar._id });

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
              TransitionCategoriesRecurrence.REGULAR_CONFIRMED,
            ],
            category: Categories_Recurrence.REGULAR,
            operation: "REGULAR_CREATED",
          },
        ]),
      );

      const { regularEvent } = await testCompassRegularEvent(payload);

      expect(regularEvent).not.toHaveProperty("recurrence");

      switch (calendar.metadata.provider) {
        case CalendarProvider.GOOGLE:
          await testCompassEventInGcal(regularEvent);
          break;
      }

      const deletePayload = {
        ...regularEvent,
        _id: regularEvent._id,
      };

      const deleteChanges = await CompassSyncProcessor.processEvents([
        {
          payload: deletePayload,
          calendar,
          providerSync: true,
          applyTo: RecurringEventUpdateScope.THIS_EVENT,
          status: EventStatus.CANCELLED,
        },
      ]);

      expect(deleteChanges).toEqual(
        expect.arrayContaining([
          {
            calendar: calendar._id,
            user: user._id,
            id: payload._id,
            title: deletePayload.title,
            transition: [
              "REGULAR",
              TransitionCategoriesRecurrence.REGULAR_CANCELLED,
            ],
            category: Categories_Recurrence.REGULAR,
            operation: "REGULAR_DELETED",
          },
        ]),
      );

      // check that event is deleted in db
      await expect(
        eventService.readById(calendar._id, deletePayload._id),
      ).rejects.toThrow();

      switch (calendar.metadata.provider) {
        case CalendarProvider.GOOGLE:
          await expect(
            EventDriver.getGCalEvent(
              calendar.user,
              EventMetadataSchema.parse(deletePayload.metadata).id,
              calendar.metadata.id,
            ),
          ).rejects.toThrow(
            `Event with id ${deletePayload.metadata?.id} not found`,
          );
          break;
      }
    });
  });
});
