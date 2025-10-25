import { RRule } from "rrule";
import { GCAL_MAX_RECURRENCES } from "@core/constants/core.constants";
import { CalendarProvider } from "@core/types/calendar.types";
import {
  Categories_Recurrence,
  EventStatus,
  EventUpdate,
  Schema_Base_Event,
} from "@core/types/event.types";
import {
  createMockBaseEvent,
  createMockStandaloneEvent,
} from "@core/util/test/ccal.event.factory";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { CompassEventParser } from "@backend/event/classes/compass.event.parser";
import {
  testCompassEventInGcal,
  testCompassEventNotInGcal,
  testCompassRegularEvent,
  testCompassSeries,
  testCompassSeriesInGcal,
} from "@backend/event/classes/compass.event.parser.test.util";

describe.each([{ calendarProvider: CalendarProvider.GOOGLE }])(
  "CompassEventParser - $calendarProvider calendar",
  ({ calendarProvider }) => {
    describe("Before Init", () => {
      it("should be called before accessing these public members", () => {
        const payload = createMockBaseEvent() as EventUpdate["payload"];

        const event = {
          payload,
          status: EventStatus.CONFIRMED,
        } as EventUpdate;

        const parser = new CompassEventParser(event);
        const developerError = GenericError.DeveloperError.description;

        expect(() => parser.category).toThrow(developerError);
        expect(() => parser.isBase).toThrow(developerError);
        expect(() => parser.isDbBase).toThrow(developerError);
        expect(() => parser.isDbInstance).toThrow(developerError);
        expect(() => parser.isDbStandalone).toThrow(developerError);
        expect(() => parser.isInstance).toThrow(developerError);
        expect(() => parser.isStandalone).toThrow(developerError);
        expect(() => parser.rrule).toThrow(developerError);
        expect(() => parser.summary).toThrow(developerError);
        expect(() => parser.transition).toThrow(developerError);
      });
    });

    describe("Init", () => {
      beforeAll(setupTestDb);

      beforeEach(cleanupCollections);

      afterAll(cleanupTestDb);

      it("should initialize these members after init", async () => {
        const payload = createMockBaseEvent() as EventUpdate["payload"];

        const event = {
          payload,
          status: EventStatus.CONFIRMED,
        } as EventUpdate;

        const parser = new CompassEventParser(event);
        const developerError = GenericError.DeveloperError.description;
        const status = event.status;

        await parser.init();

        expect(() => parser.category).not.toThrow(developerError);
        expect(() => parser.isBase).not.toThrow(developerError);
        expect(() => parser.isDbBase).not.toThrow(developerError);
        expect(() => parser.isDbInstance).not.toThrow(developerError);
        expect(() => parser.isDbStandalone).not.toThrow(developerError);
        expect(() => parser.isInstance).not.toThrow(developerError);
        expect(() => parser.isStandalone).not.toThrow(developerError);
        expect(() => parser.rrule).not.toThrow(developerError);
        expect(() => parser.summary).not.toThrow(developerError);
        expect(() => parser.transition).not.toThrow(developerError);

        expect([
          Categories_Recurrence.RECURRENCE_BASE,
          Categories_Recurrence.RECURRENCE_INSTANCE,
          Categories_Recurrence.STANDALONE,
        ]).toContain(parser.category);

        expect([
          parser.isBase,
          parser.isDbBase,
          parser.isDbInstance,
          parser.isDbStandalone,
          parser.isInstance,
          parser.isStandalone,
        ]).toContain(true);

        expect(parser.rrule).toBeInstanceOf(RRule);

        expect(parser.summary).toEqual({
          title: event.payload.title ?? event.payload._id ?? "unknown",
          transition: [null, `${parser.category}_${status}`],
          category: parser.category,
        });

        expect(parser.getTransitionString()).toStrictEqual(
          `NIL->>${parser.category}_${status}`,
        );
      });
    });

    describe("createEvent", () => {
      beforeAll(setupTestDb);

      beforeEach(cleanupCollections);

      afterAll(cleanupTestDb);

      describe("Someday: ", () => {
        it("should create a standalone event", async () => {
          const _user = await UserDriver.createUser();
          const user = _user._id.toString();
          const status = EventStatus.CONFIRMED;
          const payload = createMockStandaloneEvent({ isSomeday: true, user });
          const event = { payload, status } as EventUpdate;
          const parser = new CompassEventParser(event);

          await parser.init();

          await parser.createEvent();

          const { regularEvent } = await testCompassRegularEvent(payload);

          switch (calendarProvider) {
            case CalendarProvider.GOOGLE:
              await testCompassEventNotInGcal(regularEvent);
              break;
          }
        });

        it("should create a base event", async () => {
          const _user = await UserDriver.createUser();
          const user = _user._id.toString();
          const status = EventStatus.CONFIRMED;
          const payload = createMockBaseEvent({ isSomeday: true, user });
          const event = { payload, status } as EventUpdate;
          const parser = new CompassEventParser(event);

          await parser.init();

          await parser.createEvent();

          const { baseEvent } = await testCompassSeries(
            payload,
            GCAL_MAX_RECURRENCES,
          );

          switch (calendarProvider) {
            case CalendarProvider.GOOGLE:
              await testCompassEventNotInGcal(baseEvent);
              break;
          }
        });
      });

      describe("Calendar: ", () => {
        it("should create a standalone event", async () => {
          const _user = await UserDriver.createUser();
          const user = _user._id.toString();
          const status = EventStatus.CONFIRMED;
          const payload = createMockStandaloneEvent({ isSomeday: false, user });
          const event = { payload, status } as EventUpdate;
          const parser = new CompassEventParser(event);

          await parser.init();

          await parser.createEvent();

          const { regularEvent } = await testCompassRegularEvent(payload);

          switch (calendarProvider) {
            case CalendarProvider.GOOGLE:
              await testCompassEventInGcal(regularEvent);
              break;
          }
        });

        it("should create a base event", async () => {
          const _user = await UserDriver.createUser();
          const user = _user._id.toString();
          const status = EventStatus.CONFIRMED;
          const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
          const payload = createMockBaseEvent({ recurrence, user });
          const event = { payload, status } as EventUpdate;
          const parser = new CompassEventParser(event);

          await parser.init();

          await parser.createEvent();

          const { baseEvent, instances } = await testCompassSeries(payload, 10);

          switch (calendarProvider) {
            case CalendarProvider.GOOGLE:
              await testCompassSeriesInGcal(baseEvent!, instances);
              break;
          }
        });
      });

      describe("Transitions: ", () => {
        it("should transition a someday standalone event to a standalone event", async () => {
          const _user = await UserDriver.createUser();
          const user = _user._id.toString();
          const status = EventStatus.CONFIRMED;
          const payload = createMockStandaloneEvent({ isSomeday: true, user });
          const event = { payload, status } as EventUpdate;
          const parser = new CompassEventParser(event);

          await parser.init();

          await parser.createEvent();

          const { regularEvent: somedayRegularEvent } =
            await testCompassRegularEvent(payload);

          switch (calendarProvider) {
            case CalendarProvider.GOOGLE:
              await testCompassEventNotInGcal(somedayRegularEvent);
              break;
          }

          const transitionEvent = {
            payload: {
              ...payload,
              _id: somedayRegularEvent._id.toString(),
              isSomeday: false,
            },
            status,
          } as EventUpdate;

          const transitionParser = new CompassEventParser(transitionEvent);

          await transitionParser.init();

          await transitionParser.createEvent();

          const { regularEvent } = await testCompassRegularEvent(
            transitionEvent.payload,
          );

          switch (calendarProvider) {
            case CalendarProvider.GOOGLE:
              await testCompassEventInGcal(regularEvent);
              break;
          }
        });

        it("should transition a someday base event to a base event", async () => {
          const _user = await UserDriver.createUser();
          const user = _user._id.toString();
          const status = EventStatus.CONFIRMED;
          const isSomeday = true;
          const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
          const payload = createMockBaseEvent({ isSomeday, user, recurrence });
          const event = { payload, status } as EventUpdate;
          const parser = new CompassEventParser(event);

          await parser.init();

          await parser.createEvent();

          const { baseEvent: somedayBaseEvent } = await testCompassSeries(
            payload,
            10,
          );

          switch (calendarProvider) {
            case CalendarProvider.GOOGLE:
              await testCompassEventNotInGcal(somedayBaseEvent);
              break;
          }

          const transitionEvent = {
            payload: {
              ...payload,
              _id: somedayBaseEvent._id.toString(),
              isSomeday: false,
            },
            status,
          } as EventUpdate;

          const transitionParser = new CompassEventParser(transitionEvent);

          await transitionParser.init();

          await transitionParser.createEvent();

          const { baseEvent } = await testCompassSeries(
            transitionEvent.payload as Schema_Base_Event,
            10,
          );

          switch (calendarProvider) {
            case CalendarProvider.GOOGLE:
              await testCompassEventInGcal(baseEvent);
              break;
          }
        });
      });
    });
  },
);
