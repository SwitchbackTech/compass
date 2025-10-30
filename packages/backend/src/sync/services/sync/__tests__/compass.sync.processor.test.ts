import { faker } from "@faker-js/faker";
import {
  EVENT_CHANGED,
  SOMEDAY_EVENT_CHANGED,
} from "@core/constants/websocket.constants";
import {
  Categories_Recurrence,
  EventStatus,
  EventUpdate,
  RecurringEventUpdateScope,
} from "@core/types/event.types";
import {
  createMockBaseEvent,
  createMockRegularEvent,
} from "@core/util/test/ccal.event.factory";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";
import { Event_Transition } from "@backend/sync/sync.types";
import { AuthDriver } from "../../../../__tests__/drivers/auth.driver";
import { CalendarDriver } from "../../../../__tests__/drivers/calendar.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "../../../../__tests__/helpers/mock.db.setup";

// Import the enum

describe("CompassSyncProcessor.getNotificationType", () => {
  it("returns EVENT_CHANGED for non-SOMEDAY transitions", () => {
    const transition: Event_Transition = {
      transition: [Categories_Recurrence.REGULAR, "REGULAR_CONFIRMED"],
      title: faker.lorem.sentence(),
      operation: "REGULAR_UPDATED",
      category: Categories_Recurrence.REGULAR,
    };

    expect(CompassSyncProcessor["getNotificationType"](transition)).toEqual([
      EVENT_CHANGED,
      EVENT_CHANGED,
    ]);
  });

  it("returns SOMEDAY_EVENT_CHANGED for SOMEDAY transitions", () => {
    const transition: Event_Transition = {
      transition: [
        Categories_Recurrence.REGULAR_SOMEDAY,
        "REGULAR_SOMEDAY_CONFIRMED",
      ],
      title: faker.lorem.sentence(),
      operation: "REGULAR_SOMEDAY_UPDATED",
      category: Categories_Recurrence.REGULAR_SOMEDAY,
    };

    expect(CompassSyncProcessor["getNotificationType"](transition)).toEqual([
      SOMEDAY_EVENT_CHANGED,
      SOMEDAY_EVENT_CHANGED,
    ]);
  });

  it("returns mixed notifications for mixed transitions", () => {
    const transition: Event_Transition = {
      transition: [Categories_Recurrence.REGULAR_SOMEDAY, "REGULAR_CONFIRMED"],
      title: faker.lorem.sentence(),
      operation: "REGULAR_CREATED",
      category: Categories_Recurrence.REGULAR_SOMEDAY,
    };

    expect(CompassSyncProcessor["getNotificationType"](transition)).toEqual([
      SOMEDAY_EVENT_CHANGED,
      EVENT_CHANGED,
    ]);
  });
});

describe("CompassSyncProcessor.notifyClients", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  beforeEach(() => {
    jest.spyOn(webSocketServer, "handleBackgroundCalendarChange").mockClear();
    jest.spyOn(webSocketServer, "handleBackgroundSomedayChange").mockClear();
  });

  it("notifies correct users and events", async () => {
    const newUserA = await AuthDriver.googleSignup();
    const userA = await AuthDriver.googleLogin(newUserA._id);
    const calendarA = await CalendarDriver.getRandomUserCalendar(userA._id);
    const newUserB = await AuthDriver.googleSignup();
    const userB = await AuthDriver.googleLogin(newUserB._id);
    const calendarB = await CalendarDriver.getRandomUserCalendar(userB._id);

    const calendarSpy = jest.spyOn(
      webSocketServer,
      "handleBackgroundCalendarChange",
    );

    const somedaySpy = jest.spyOn(
      webSocketServer,
      "handleBackgroundSomedayChange",
    );

    const applyTo = RecurringEventUpdateScope.THIS_EVENT;
    const status = EventStatus.CONFIRMED;

    const events: EventUpdate[] = [
      {
        calendar: calendarA,
        applyTo,
        providerSync: true,
        status,
        payload: createMockBaseEvent({
          calendar: calendarA._id,
        }),
      },
      {
        calendar: calendarB,
        applyTo,
        providerSync: true,
        status,
        payload: createMockRegularEvent({
          isSomeday: true,
          calendar: calendarB._id,
        }),
      },
    ];

    const summary: Event_Transition[] = [
      {
        title: events[0]!.payload.title!,
        transition: [null, "RECURRENCE_BASE_CONFIRMED"],
        operation: "RECURRENCE_BASE_CREATED",
        category: Categories_Recurrence.RECURRENCE_BASE,
      },
      {
        title: events[1]!.payload.title!,
        transition: [null, "REGULAR_SOMEDAY_CONFIRMED"],
        operation: "REGULAR_SOMEDAY_CREATED",
        category: Categories_Recurrence.REGULAR_SOMEDAY,
      },
    ];

    CompassSyncProcessor["notifyClients"](events, summary);

    expect(calendarSpy).toHaveBeenCalledWith(calendarA.user);
    expect(somedaySpy).toHaveBeenCalledWith(calendarB.user);
  });
});
