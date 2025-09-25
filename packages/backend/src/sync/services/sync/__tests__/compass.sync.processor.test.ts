import { faker } from "@faker-js/faker";
import {
  EVENT_CHANGED,
  SOMEDAY_EVENT_CHANGED,
} from "@core/constants/websocket.constants";
import {
  Categories_Recurrence,
  CompassEvent,
  CompassEventStatus,
  RecurringEventUpdateScope,
} from "@core/types/event.types";
import {
  createMockBaseEvent,
  createMockStandaloneEvent,
} from "@core/util/test/ccal.event.factory";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";
import { Event_Transition } from "@backend/sync/sync.types";

// Import the enum

describe("CompassSyncProcessor.getNotificationType", () => {
  it("returns EVENT_CHANGED for non-SOMEDAY transitions", () => {
    const transition: Event_Transition = {
      transition: [Categories_Recurrence.STANDALONE, "STANDALONE_CONFIRMED"],
      title: faker.lorem.sentence(),
      operation: "STANDALONE_UPDATED",
      category: Categories_Recurrence.STANDALONE,
    };

    expect(CompassSyncProcessor["getNotificationType"](transition)).toEqual([
      EVENT_CHANGED,
      EVENT_CHANGED,
    ]);
  });

  it("returns SOMEDAY_EVENT_CHANGED for SOMEDAY transitions", () => {
    const transition: Event_Transition = {
      transition: [
        Categories_Recurrence.STANDALONE_SOMEDAY,
        "STANDALONE_SOMEDAY_CONFIRMED",
      ],
      title: faker.lorem.sentence(),
      operation: "STANDALONE_SOMEDAY_UPDATED",
      category: Categories_Recurrence.STANDALONE_SOMEDAY,
    };

    expect(CompassSyncProcessor["getNotificationType"](transition)).toEqual([
      SOMEDAY_EVENT_CHANGED,
      SOMEDAY_EVENT_CHANGED,
    ]);
  });

  it("returns mixed notifications for mixed transitions", () => {
    const transition: Event_Transition = {
      transition: [
        Categories_Recurrence.STANDALONE_SOMEDAY,
        "STANDALONE_CONFIRMED",
      ],
      title: faker.lorem.sentence(),
      operation: "STANDALONE_CREATED",
      category: Categories_Recurrence.STANDALONE_SOMEDAY,
    };

    expect(CompassSyncProcessor["getNotificationType"](transition)).toEqual([
      SOMEDAY_EVENT_CHANGED,
      EVENT_CHANGED,
    ]);
  });
});

describe("CompassSyncProcessor.notifyClients", () => {
  beforeEach(() => {
    jest.spyOn(webSocketServer, "handleBackgroundCalendarChange").mockClear();
    jest.spyOn(webSocketServer, "handleBackgroundSomedayChange").mockClear();
  });

  it("notifies correct users and events", () => {
    const calendarSpy = jest.spyOn(
      webSocketServer,
      "handleBackgroundCalendarChange",
    );

    const somedaySpy = jest.spyOn(
      webSocketServer,
      "handleBackgroundSomedayChange",
    );

    const applyTo = RecurringEventUpdateScope.THIS_EVENT;
    const status = CompassEventStatus.CONFIRMED;
    const userA = faker.database.mongodbObjectId();
    const userB = faker.database.mongodbObjectId();

    const events: CompassEvent[] = [
      {
        applyTo,
        status,
        payload: createMockBaseEvent({
          user: userA,
        }) as CompassEvent["payload"],
      },
      {
        applyTo,
        status,
        payload: createMockStandaloneEvent({
          isSomeday: true,
          user: userB,
        }) as CompassEvent["payload"],
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
        transition: [null, "STANDALONE_SOMEDAY_CONFIRMED"],
        operation: "STANDALONE_SOMEDAY_CREATED",
        category: Categories_Recurrence.STANDALONE_SOMEDAY,
      },
    ];

    CompassSyncProcessor["notifyClients"](events, summary);

    expect(calendarSpy).toHaveBeenCalledWith(userA);
    expect(somedaySpy).toHaveBeenCalledWith(userB);
  });
});
