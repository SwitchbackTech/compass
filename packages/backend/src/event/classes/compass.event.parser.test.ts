/** @jest-environment node */

import {
  analyzeCompassTransition,
  buildCompassTransitionContext,
} from "@backend/event/classes/compass.event.parser";
import {
  Categories_Recurrence,
  type CompassEvent,
  CompassEventStatus,
  type Schema_Event,
} from "@core/types/event.types";
import {
  createMockBaseEvent,
  createMockStandaloneEvent,
} from "@core/util/test/ccal.event.factory";
import { ObjectId, type WithId } from "mongodb";
import { RRule } from "rrule";

function toDbEvent(event: Schema_Event): WithId<Omit<Schema_Event, "_id">> {
  return {
    ...event,
    _id: new ObjectId(event._id),
  } as WithId<Omit<Schema_Event, "_id">>;
}

describe("compass.event.parser", () => {
  it("builds an explicit transition context", () => {
    const payload = createMockBaseEvent();
    const event = {
      payload,
      status: CompassEventStatus.CONFIRMED,
    } as CompassEvent;

    const context = buildCompassTransitionContext(event, null);

    expect(context.eventCategory).toBe(Categories_Recurrence.RECURRENCE_BASE);
    expect(context.dbCategory).toBeNull();
    expect(context.summary).toEqual({
      title: payload.title ?? payload._id ?? "unknown",
      transition: [null, "RECURRENCE_BASE_CONFIRMED"],
      category: Categories_Recurrence.RECURRENCE_BASE,
    });
    expect(context.transitionKey).toBe("NIL->>RECURRENCE_BASE_CONFIRMED");
    expect(context.rrule).toBeInstanceOf(RRule);
  });

  it("plans a calendar create without Google work for someday events", () => {
    const payload = createMockStandaloneEvent({ isSomeday: true });
    const event = {
      payload,
      status: CompassEventStatus.CONFIRMED,
    } as CompassEvent;

    const plan = analyzeCompassTransition(event, null);

    expect(plan.compassMutation).toBe("CREATE");
    expect(plan.operation).toBe("STANDALONE_SOMEDAY_CREATED");
    expect(plan.googleEffect).toEqual({ type: "none" });
    expect(plan.steps).toEqual([
      expect.objectContaining({ type: "create", event: expect.any(Object) }),
    ]);
  });

  it("keeps the from-category in the summary when transitioning someday to calendar", () => {
    const payload = createMockStandaloneEvent({ isSomeday: false });
    const event = {
      payload,
      status: CompassEventStatus.CONFIRMED,
    } as CompassEvent;
    const dbEvent = toDbEvent({ ...payload, isSomeday: true });

    const plan = analyzeCompassTransition(event, dbEvent);

    expect(plan.summary.category).toBe(
      Categories_Recurrence.STANDALONE_SOMEDAY,
    );
    expect(plan.operation).toBe("STANDALONE_CREATED");
    expect(plan.googleEffect).toEqual({ type: "create" });
  });

  it("uses truncate_series when only the recurrence until changes", () => {
    const dbPayload = createMockBaseEvent({
      recurrence: {
        rule: ["RRULE:FREQ=WEEKLY;UNTIL=20260131T170000Z"],
      },
    }) as Schema_Event;
    const payload = {
      ...dbPayload,
      recurrence: {
        rule: ["RRULE:FREQ=WEEKLY;UNTIL=20260124T170000Z"],
      },
    };
    const event = {
      payload,
      status: CompassEventStatus.CONFIRMED,
    } as CompassEvent;

    const plan = analyzeCompassTransition(event, toDbEvent(dbPayload));

    expect(plan.compassMutation).toBe("TRUNCATE_SERIES");
    expect(plan.steps.map(({ type }) => type)).toEqual([
      "delete_instances_after_until",
      "update_series",
    ]);
  });

  it("uses recreate_series when recurrence semantics other than until change", () => {
    const dbPayload = createMockBaseEvent({
      recurrence: {
        rule: ["RRULE:FREQ=WEEKLY;COUNT=10"],
      },
    }) as Schema_Event;
    const payload = {
      ...dbPayload,
      recurrence: {
        rule: ["RRULE:FREQ=DAILY;COUNT=5"],
      },
    };
    const event = {
      payload,
      status: CompassEventStatus.CONFIRMED,
    } as CompassEvent;

    const plan = analyzeCompassTransition(event, toDbEvent(dbPayload));

    expect(plan.compassMutation).toBe("RECREATE_SERIES");
    expect(plan.steps.map(({ type }) => type)).toEqual([
      "delete_series",
      "create",
    ]);
  });

  it("marks series-to-standalone updates to clear recurrence before Google sync", () => {
    const dbPayload = createMockBaseEvent({
      recurrence: {
        rule: ["RRULE:FREQ=WEEKLY;COUNT=10"],
      },
    }) as Schema_Event;
    const payload = createMockStandaloneEvent({
      _id: dbPayload._id,
      user: dbPayload.user,
      isSomeday: false,
    });
    const event = {
      payload,
      status: CompassEventStatus.CONFIRMED,
    } as CompassEvent;

    const plan = analyzeCompassTransition(event, toDbEvent(dbPayload));

    expect(plan.operation).toBe("RECURRENCE_BASE_UPDATED");
    expect(plan.googleEffect).toEqual({ type: "update" });
    expect(plan.clearRecurrenceBeforeGoogleUpdate).toBe(true);
  });

  it("prefers the persisted gEventId for delete-oriented Google effects", () => {
    const payload = createMockStandaloneEvent();
    const event = {
      payload: { ...payload, gEventId: undefined },
      status: CompassEventStatus.CANCELLED,
    } as CompassEvent;
    const dbEvent = toDbEvent({ ...payload, gEventId: "persisted-g-event-id" });

    const plan = analyzeCompassTransition(event, dbEvent);

    expect(plan.googleEffect).toEqual({
      type: "delete",
      deleteEventId: "persisted-g-event-id",
    });
  });
});
