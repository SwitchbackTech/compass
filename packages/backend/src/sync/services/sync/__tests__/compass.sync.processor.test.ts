/** @jest-environment node */
import { faker } from "@faker-js/faker";
import {
  EVENT_CHANGED,
  SOMEDAY_EVENT_CHANGED,
} from "@core/constants/websocket.constants";
import {
  CalendarProvider,
  Categories_Recurrence,
  type CompassEvent,
  CompassEventStatus,
  RecurringEventUpdateScope,
} from "@core/types/event.types";
import {
  createMockBaseEvent,
  createMockStandaloneEvent,
} from "@core/util/test/ccal.event.factory";
import mongoService from "@backend/common/services/mongo.service";
import { type CompassApplyResult } from "@backend/event/classes/compass.event.executor";
import * as compassExecutor from "@backend/event/classes/compass.event.executor";
import * as compassParser from "@backend/event/classes/compass.event.parser";
import * as eventService from "@backend/event/services/event.service";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";
import { type Event_Transition } from "@backend/sync/sync.types";

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

    const events = [
      {
        applyTo,
        status,
        payload: createMockBaseEvent({ user: userA }),
      } as CompassEvent,
      {
        applyTo,
        status,
        payload: createMockStandaloneEvent({ isSomeday: true, user: userB }),
      } as CompassEvent,
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

describe("CompassSyncProcessor.handleCompassChange", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("loads db state, analyzes, applies, and emits the summary", async () => {
    const payload = createMockStandaloneEvent();
    const event = {
      payload,
      status: CompassEventStatus.CONFIRMED,
      applyTo: RecurringEventUpdateScope.THIS_EVENT,
    } as CompassEvent;
    const dbEvent = null;
    const plan: compassParser.CompassOperationPlan = {
      summary: {
        title: payload.title!,
        transition: [null, "STANDALONE_CONFIRMED"],
        category: Categories_Recurrence.STANDALONE,
      },
      operation: "STANDALONE_CREATED",
      transitionKey: "NIL->>STANDALONE_CONFIRMED",
      provider: CalendarProvider.GOOGLE,
      compassMutation: "create",
      googleEffect: { type: "none" },
      event: payload as never,
      rrule: null,
      steps: [],
    };
    const applyResult: CompassApplyResult = {
      applied: true,
      summary: {
        ...plan.summary,
        operation: plan.operation,
      },
    };

    const findOneSpy = jest.fn().mockResolvedValueOnce(dbEvent);
    jest
      .spyOn(mongoService, "event", "get")
      .mockReturnValue({ findOne: findOneSpy } as never);
    const analyzeSpy = jest
      .spyOn(compassParser, "analyzeCompassTransition")
      .mockReturnValueOnce(plan as never);
    const applySpy = jest
      .spyOn(compassExecutor, "applyCompassPlan")
      .mockResolvedValueOnce(applyResult);

    await expect(
      CompassSyncProcessor["handleCompassChange"](event),
    ).resolves.toEqual([applyResult.summary]);

    expect(findOneSpy).toHaveBeenCalledWith(
      expect.objectContaining({ user: payload.user }),
      { session: undefined },
    );
    expect(analyzeSpy).toHaveBeenCalledWith(event, dbEvent);
    expect(applySpy).toHaveBeenCalledWith(plan, undefined);
    expect(findOneSpy.mock.invocationCallOrder[0]).toBeLessThan(
      analyzeSpy.mock.invocationCallOrder[0]!,
    );
    expect(analyzeSpy.mock.invocationCallOrder[0]).toBeLessThan(
      applySpy.mock.invocationCallOrder[0]!,
    );
  });

  it("deletes Google events using the persisted db gEventId fallback", async () => {
    const payload = createMockStandaloneEvent({ gEventId: undefined });
    const event = {
      payload,
      status: CompassEventStatus.CANCELLED,
      applyTo: RecurringEventUpdateScope.THIS_EVENT,
    } as CompassEvent;
    const dbEvent = {
      ...payload,
      gEventId: "persisted-google-id",
    };
    const deleteSpy = jest
      .spyOn(eventService, "_deleteGcal")
      .mockResolvedValueOnce(true);

    const findOneSpy = jest.fn().mockResolvedValueOnce(dbEvent);
    jest
      .spyOn(mongoService, "event", "get")
      .mockReturnValue({ findOne: findOneSpy } as never);
    jest.spyOn(compassExecutor, "applyCompassPlan").mockImplementationOnce(
      async (plan) =>
        ({
          applied: true,
          summary: {
            ...plan.summary,
            operation: plan.operation,
          },
          googleDeleteEventId:
            plan.googleEffect.type === "delete"
              ? plan.googleEffect.deleteEventId
              : undefined,
        }) as CompassApplyResult,
    );

    await expect(
      CompassSyncProcessor["handleCompassChange"](event),
    ).resolves.toEqual([
      {
        title: payload.title!,
        transition: [Categories_Recurrence.STANDALONE, "STANDALONE_CANCELLED"],
        category: Categories_Recurrence.STANDALONE,
        operation: "STANDALONE_DELETED",
      },
    ]);

    expect(deleteSpy).toHaveBeenCalledWith(
      payload.user!,
      "persisted-google-id",
    );
  });
});
