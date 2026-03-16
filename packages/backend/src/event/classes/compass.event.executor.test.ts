/** @jest-environment node */
import { ObjectId } from "mongodb";
import {
  CalendarProvider,
  Categories_Recurrence,
  type Schema_Event,
  type Schema_Event_Recur_Base,
  type WithCompassId,
} from "@core/types/event.types";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";
import {
  createMockBaseEvent,
  createMockStandaloneEvent,
} from "@core/util/test/ccal.event.factory";
import {
  type CompassApplyResult,
  applyCompassPlan,
} from "@backend/event/classes/compass.event.executor";
import { type CompassOperationPlan } from "@backend/event/classes/compass.event.parser";
import * as eventService from "@backend/event/services/event.service";

jest.mock("@backend/event/services/event.service", () => ({
  _createCompassEvent: jest.fn(),
  _deleteInstancesAfterUntil: jest.fn(),
  _deleteSeries: jest.fn(),
  _deleteSingleCompassEvent: jest.fn(),
  _updateCompassEvent: jest.fn(),
  _updateCompassSeries: jest.fn(),
}));

function normalizeEvent(event: Schema_Event) {
  return {
    ...event,
    _id: new ObjectId(event._id),
  };
}

function buildSummary() {
  return {
    title: "test event",
    transition: [null, "STANDALONE_CONFIRMED"] as [
      null,
      "STANDALONE_CONFIRMED",
    ],
    category: Categories_Recurrence.STANDALONE,
  };
}

function buildTransition(
  operation: CompassOperationPlan["operation"],
): CompassApplyResult["summary"] {
  return {
    ...buildSummary(),
    operation,
  };
}

describe("applyCompassPlan", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("creates Compass data and returns the persisted event", async () => {
    const payload = createMockStandaloneEvent();
    const event = normalizeEvent(payload);
    const persistedEvent = {
      ...payload,
      updatedAt: new Date(),
    } as WithCompassId<Omit<Schema_Event, "_id">>;

    jest
      .spyOn(eventService, "_createCompassEvent")
      .mockResolvedValueOnce(persistedEvent);

    const plan: CompassOperationPlan = {
      summary: buildSummary(),
      operation: "STANDALONE_CREATED",
      transitionKey: "NIL->>STANDALONE_CONFIRMED",
      provider: CalendarProvider.GOOGLE,
      compassMutation: "CREATE",
      googleEffect: { type: "create" },
      event,
      rrule: null,
      steps: [{ type: "create", event, rrule: null }],
    };

    const result = await applyCompassPlan(plan);

    expect(eventService._createCompassEvent).toHaveBeenCalledWith(
      { ...event, user: event.user! },
      CalendarProvider.GOOGLE,
      null,
      undefined,
    );
    expect(result).toEqual({
      applied: true,
      summary: buildTransition("STANDALONE_CREATED"),
      persistedEvent,
      googleDeleteEventId: undefined,
    });
  });

  it("truncates a series before updating it", async () => {
    const payload = createMockBaseEvent({
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;UNTIL=20260124T170000Z"] },
    }) as Schema_Event_Recur_Base;
    const event = normalizeEvent(payload) as ReturnType<typeof normalizeEvent> &
      Schema_Event_Recur_Base;
    const rrule = new CompassEventRRule(event as never);
    const persistedEvent = {
      ...payload,
      updatedAt: new Date(),
    } as WithCompassId<Omit<Schema_Event, "_id">>;

    jest
      .spyOn(eventService, "_updateCompassSeries")
      .mockResolvedValueOnce(persistedEvent);

    const until = rrule.options.until!;
    const plan: CompassOperationPlan = {
      summary: buildSummary(),
      operation: "RECURRENCE_BASE_UPDATED",
      transitionKey: "RECURRENCE_BASE->>RECURRENCE_BASE_CONFIRMED",
      provider: CalendarProvider.GOOGLE,
      compassMutation: "TRUNCATE_SERIES",
      googleEffect: { type: "update" },
      event,
      rrule,
      steps: [
        {
          type: "delete_instances_after_until",
          userId: event.user!,
          baseId: event._id.toString(),
          until,
        },
        {
          type: "update_series",
          event,
        },
      ],
    };

    const result = await applyCompassPlan(plan);

    expect(eventService._deleteInstancesAfterUntil).toHaveBeenCalledWith(
      event.user!,
      event._id.toString(),
      until,
      undefined,
    );
    expect(eventService._updateCompassSeries).toHaveBeenCalledWith(
      { ...event, user: event.user! },
      undefined,
    );
    expect(result.persistedEvent).toBe(persistedEvent);
  });

  it("uses the deleted event gEventId when it is available", async () => {
    const payload = createMockStandaloneEvent();
    const event = normalizeEvent(payload);
    const deletedEvent = {
      ...payload,
      gEventId: "deleted-from-db",
      updatedAt: new Date(),
    } as WithCompassId<Omit<Schema_Event, "_id">>;

    jest
      .spyOn(eventService, "_deleteSingleCompassEvent")
      .mockResolvedValueOnce(deletedEvent);

    const plan: CompassOperationPlan = {
      summary: buildSummary(),
      operation: "STANDALONE_DELETED",
      transitionKey: "STANDALONE->>STANDALONE_CANCELLED",
      provider: CalendarProvider.GOOGLE,
      compassMutation: "DELETE",
      googleEffect: { type: "delete", deleteEventId: "fallback-from-plan" },
      event,
      rrule: null,
      steps: [{ type: "delete_single", event }],
    };

    const result = await applyCompassPlan(plan);

    expect(result.googleDeleteEventId).toBe("deleted-from-db");
  });
});
