import { GCAL_MAX_RECURRENCES } from "@core/constants/core.constants";
import { CalendarProvider } from "@core/types/calendar.types";
import {
  BaseEventSchema,
  Categories_Recurrence,
  EventStatus,
  InstanceEventSchema,
  RecurringEventUpdateScope,
  ThisEventUpdate,
} from "@core/types/event.types";
import {
  createMockBaseEvent,
  createMockRegularEvent,
} from "@core/util/test/ccal.event.factory";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import { CalendarDriver } from "@backend/__tests__/drivers/calendar.driver";
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

describe("CompassEventParser", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  describe("Before Init", () => {
    it("should be called before accessing these public members", async () => {
      const _user = await AuthDriver.googleSignup();
      const calendar = await CalendarDriver.getRandomUserCalendar(_user._id);
      const payload = createMockBaseEvent({ calendar: calendar._id });

      const event: ThisEventUpdate = {
        payload,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
        calendar,
        providerSync: true,
        status: EventStatus.CONFIRMED,
      };

      const parser = new CompassEventParser(event);
      const developerError = GenericError.DeveloperError.description;

      expect(() => parser.category).toThrow(developerError);
      expect(() => parser.isBase).toThrow(developerError);
      expect(() => parser.isDbBase).toThrow(developerError);
      expect(() => parser.isDbInstance).toThrow(developerError);
      expect(() => parser.isDbRegular).toThrow(developerError);
      expect(() => parser.isInstance).toThrow(developerError);
      expect(() => parser.isRegular).toThrow(developerError);
      expect(() => parser.summary).toThrow(developerError);
      expect(() => parser.transition).toThrow(developerError);
    });
  });

  describe("Init", () => {
    it("should initialize these members after init", async () => {
      const _user = await AuthDriver.googleSignup();
      const calendar = await CalendarDriver.getRandomUserCalendar(_user._id);
      const payload = createMockBaseEvent({ calendar: calendar._id });

      const event: ThisEventUpdate = {
        payload,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
        calendar,
        providerSync: true,
        status: EventStatus.CONFIRMED,
      };

      const parser = new CompassEventParser(event);
      const developerError = GenericError.DeveloperError.description;
      const status = event.status;

      await parser.init();

      expect(() => parser.category).not.toThrow(developerError);
      expect(() => parser.isBase).not.toThrow(developerError);
      expect(() => parser.isDbBase).not.toThrow(developerError);
      expect(() => parser.isDbInstance).not.toThrow(developerError);
      expect(() => parser.isDbRegular).not.toThrow(developerError);
      expect(() => parser.isInstance).not.toThrow(developerError);
      expect(() => parser.isRegular).not.toThrow(developerError);
      expect(() => parser.summary).not.toThrow(developerError);
      expect(() => parser.transition).not.toThrow(developerError);

      expect([
        Categories_Recurrence.RECURRENCE_BASE,
        Categories_Recurrence.RECURRENCE_INSTANCE,
        Categories_Recurrence.REGULAR,
      ]).toContain(parser.category);

      expect([
        parser.isBase,
        parser.isDbBase,
        parser.isDbInstance,
        parser.isDbRegular,
        parser.isInstance,
        parser.isRegular,
      ]).toContain(true);

      expect(parser.summary).toEqual({
        calendar: event.calendar._id,
        user: event.calendar.user,
        id: event.payload._id,
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
    describe("Someday: ", () => {
      it("should create a standalone event", async () => {
        const _user = await AuthDriver.googleSignup();
        const calendar = await CalendarDriver.getRandomUserCalendar(_user._id);

        const status = EventStatus.CONFIRMED;
        const payload = createMockRegularEvent({
          isSomeday: true,
          calendar: calendar?._id,
        });

        const event: ThisEventUpdate = {
          payload,
          status,
          calendar,
          providerSync: true,
          applyTo: RecurringEventUpdateScope.THIS_EVENT,
        };

        const parser = new CompassEventParser(event);

        await parser.init();

        await parser.createEvent();

        const { regularEvent } = await testCompassRegularEvent(payload);

        switch (calendar.metadata.provider) {
          case CalendarProvider.GOOGLE:
            await testCompassEventNotInGcal(regularEvent);
            break;
        }
      });

      it("should create a base event", async () => {
        const status = EventStatus.CONFIRMED;
        const _user = await AuthDriver.googleSignup();
        const calendar = await CalendarDriver.getRandomUserCalendar(_user._id);

        const payload = createMockBaseEvent({
          isSomeday: true,
          calendar: calendar._id,
        });

        const event: ThisEventUpdate = {
          payload,
          status,
          calendar,
          providerSync: true,
          applyTo: RecurringEventUpdateScope.THIS_EVENT,
        };

        const parser = new CompassEventParser(event);

        await parser.init();

        await parser.createEvent();

        const { baseEvent } = await testCompassSeries(
          payload,
          GCAL_MAX_RECURRENCES,
        );

        switch (calendar.metadata.provider) {
          case CalendarProvider.GOOGLE:
            await testCompassEventNotInGcal(baseEvent);
            break;
        }
      });
    });

    describe("Calendar: ", () => {
      it("should create a standalone event", async () => {
        const _user = await AuthDriver.googleSignup();
        const calendar = await CalendarDriver.getRandomUserCalendar(_user._id);

        const status = EventStatus.CONFIRMED;

        const payload = createMockRegularEvent({
          isSomeday: false,
          calendar: calendar._id,
        });

        const event: ThisEventUpdate = {
          payload,
          status,
          calendar,
          providerSync: true,
          applyTo: RecurringEventUpdateScope.THIS_EVENT,
        };

        const parser = new CompassEventParser(event);

        await parser.init();

        await parser.createEvent();

        const { regularEvent } = await testCompassRegularEvent(payload);

        switch (calendar.metadata.provider) {
          case CalendarProvider.GOOGLE:
            await testCompassEventInGcal(regularEvent);
            break;
        }
      });

      it("should create a base event", async () => {
        const _user = await AuthDriver.googleSignup();
        const calendar = await CalendarDriver.getRandomUserCalendar(_user._id);

        const status = EventStatus.CONFIRMED;
        const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
        const payload = createMockBaseEvent({
          recurrence,
          calendar: calendar._id,
        });

        const event: ThisEventUpdate = {
          payload,
          status,
          calendar,
          providerSync: true,
          applyTo: RecurringEventUpdateScope.THIS_EVENT,
        };

        const parser = new CompassEventParser(event);

        await parser.init();

        await parser.createEvent();

        const { baseEvent, instances } = await testCompassSeries(payload, 10);

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

    describe("Transitions: ", () => {
      it("should transition a someday standalone event to a standalone event", async () => {
        const _user = await AuthDriver.googleSignup();
        const calendar = await CalendarDriver.getRandomUserCalendar(_user._id);

        const status = EventStatus.CONFIRMED;
        const payload = createMockRegularEvent({
          isSomeday: true,
          calendar: calendar._id,
        });

        const event: ThisEventUpdate = {
          payload,
          status,
          applyTo: RecurringEventUpdateScope.THIS_EVENT,
          calendar,
          providerSync: true,
        };

        const parser = new CompassEventParser(event);

        await parser.init();

        await parser.createEvent();

        const { regularEvent: somedayRegularEvent } =
          await testCompassRegularEvent(payload);

        switch (calendar.metadata.provider) {
          case CalendarProvider.GOOGLE:
            await testCompassEventNotInGcal(somedayRegularEvent);
            break;
        }

        const transitionEvent: ThisEventUpdate = {
          calendar,
          providerSync: true,
          applyTo: RecurringEventUpdateScope.THIS_EVENT,
          payload: {
            ...payload,
            _id: somedayRegularEvent._id,
            isSomeday: false,
          },
          status,
        };

        const transitionParser = new CompassEventParser(transitionEvent);

        await transitionParser.init();

        await transitionParser.createEvent();

        const { regularEvent } = await testCompassRegularEvent(
          transitionEvent.payload,
        );

        switch (calendar.metadata.provider) {
          case CalendarProvider.GOOGLE:
            await testCompassEventInGcal(regularEvent);
            break;
        }
      });

      it("should transition a someday base event to a base event", async () => {
        const _user = await AuthDriver.googleSignup();
        const calendar = await CalendarDriver.getRandomUserCalendar(_user._id);

        const status = EventStatus.CONFIRMED;
        const isSomeday = true;
        const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
        const payload = createMockBaseEvent({
          isSomeday,
          calendar: calendar._id,
          recurrence,
        });

        const event: ThisEventUpdate = {
          applyTo: RecurringEventUpdateScope.THIS_EVENT,
          calendar,
          providerSync: true,
          payload,
          status,
        };

        const parser = new CompassEventParser(event);

        await parser.init();

        await parser.createEvent();

        const { baseEvent: somedayBaseEvent } = await testCompassSeries(
          payload,
          10,
        );

        switch (calendar.metadata.provider) {
          case CalendarProvider.GOOGLE:
            await testCompassEventNotInGcal(somedayBaseEvent);
            break;
        }

        const transitionEvent: ThisEventUpdate = {
          status,
          calendar,
          providerSync: true,
          applyTo: RecurringEventUpdateScope.THIS_EVENT,
          payload: { ...payload, isSomeday: false },
        };

        const transitionParser = new CompassEventParser(transitionEvent);

        await transitionParser.init();

        await transitionParser.createEvent();

        const { baseEvent } = await testCompassSeries(
          BaseEventSchema.parse(transitionEvent.payload),
          10,
        );

        switch (calendar.metadata.provider) {
          case CalendarProvider.GOOGLE:
            await testCompassEventInGcal(baseEvent);
            break;
        }
      });
    });
  });
});
