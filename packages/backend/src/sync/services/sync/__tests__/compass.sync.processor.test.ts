import { ObjectId } from "bson";
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
  TransitionCategoriesRecurrence,
} from "@core/types/event.types";
import { Event_Transition } from "@core/types/sync.types";
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
import { webSocketServer } from "@backend/servers/websocket/websocket.server";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";

// Import the enum

describe("CompassSyncProcessor.getNotificationType", () => {
  it("returns EVENT_CHANGED for non-SOMEDAY transitions", () => {
    const transition: Event_Transition = {
      calendar: new ObjectId(),
      user: new ObjectId(),
      id: new ObjectId(),
      transition: [
        Categories_Recurrence.REGULAR,
        TransitionCategoriesRecurrence.REGULAR_CONFIRMED,
      ],
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
      calendar: new ObjectId(),
      user: new ObjectId(),
      id: new ObjectId(),
      transition: [
        Categories_Recurrence.REGULAR_SOMEDAY,
        TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CONFIRMED,
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
      id: new ObjectId(),
      calendar: new ObjectId(),
      user: new ObjectId(),
      transition: [
        Categories_Recurrence.REGULAR_SOMEDAY,
        TransitionCategoriesRecurrence.REGULAR_CONFIRMED,
      ],
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

    const summaries: Event_Transition[] = [
      {
        calendar: calendarA._id,
        user: calendarA.user,
        id: events[0]!.payload._id,
        title: events[0]!.payload.title!,
        transition: [
          null,
          TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
        ],
        operation: "SERIES_CREATED",
        category: Categories_Recurrence.RECURRENCE_BASE,
      },
      {
        calendar: calendarB._id,
        user: calendarB.user,
        id: events[1]!.payload._id,
        title: events[1]!.payload.title!,
        transition: [
          null,
          TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CONFIRMED,
        ],
        operation: "REGULAR_SOMEDAY_CREATED",
        category: Categories_Recurrence.REGULAR_SOMEDAY,
      },
    ];

    CompassSyncProcessor["notifyClients"](summaries);

    expect(calendarSpy).toHaveBeenCalledWith(calendarA.user.toString());
    expect(somedaySpy).toHaveBeenCalledWith(calendarB.user.toString());

    calendarSpy.mockRestore();
    somedaySpy.mockRestore();
  });
});
