import { renderHook } from "@testing-library/react";
import { act } from "react";
import { Frequency } from "rrule";
import { EventIdSchema } from "@core/types/domain-primitives";
import { EventScheduleSchema } from "@core/types/event.contracts";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { type GridEventDraft } from "@web/events/event-draft.types";
import {
  createGridEventDraft,
  editGridEventDraft,
} from "@web/events/grid-event-draft.adapter";
import { useRecurrence } from "./useRecurrence";
import { describe, expect, it, mock } from "bun:test";

const SCHEDULE = EventScheduleSchema.parse({
  kind: "timed",
  start: "2026-05-31T10:00:00.000Z",
  end: "2026-05-31T11:00:00.000Z",
  timeZone: "UTC",
});

const baseDraft = () =>
  createGridEventDraft({
    kind: "timed",
    start: new Date("2026-05-31T10:00:00.000Z"),
    end: new Date("2026-05-31T11:00:00.000Z"),
    timeZone: "UTC",
  });

describe("useRecurrence hook", () => {
  it("initializes with no recurrence", () => {
    const draft = baseDraft();
    const setDraft = mock();
    const { result } = renderHook(() => useRecurrence(draft, { setDraft }));

    expect(result.current.hasRecurrence).toBe(false);
    expect(result.current.interval).toBe(1);
    expect(result.current.freq).toBe(Frequency.DAILY);
    expect(result.current.weekDays).toEqual([]);
    expect(result.current.until).toBeNull();
  });

  it("can toggle recurrence", () => {
    const draft = baseDraft();
    const setDraft = mock();
    const { result } = renderHook(() => useRecurrence(draft, { setDraft }));
    act(() => {
      result.current.toggleRecurrence();
    });
    expect(setDraft).toHaveBeenCalled();
  });

  it("can set interval", () => {
    const draft = baseDraft();
    const setDraft = mock();
    const { result } = renderHook(() => useRecurrence(draft, { setDraft }));

    act(() => {
      result.current.toggleRecurrence();
      result.current.setInterval(3);
    });

    expect(setDraft).toHaveBeenCalled();
    expect(result.current.interval).toBe(3);
  });

  it("can set frequency", () => {
    const draft = baseDraft();
    const setDraft = mock();
    const { result } = renderHook(() => useRecurrence(draft, { setDraft }));

    act(() => {
      result.current.toggleRecurrence();
      result.current.setFreq(Frequency.MONTHLY);
    });

    expect(setDraft).toHaveBeenCalled();
    expect(result.current.freq).toBe(Frequency.MONTHLY);
  });

  it("can set weekDays", () => {
    const draft = baseDraft();
    const setDraft = mock();
    const { result } = renderHook(() => useRecurrence(draft, { setDraft }));

    act(() => {
      result.current.toggleRecurrence();
      result.current.setWeekDays(["monday", "friday"]);
    });

    expect(setDraft).toHaveBeenCalled();
    expect(result.current.weekDays).toEqual(["monday", "friday"]);
  });

  it("can set until date", () => {
    const draft = baseDraft();
    const setDraft = mock();
    const { result } = renderHook(() => useRecurrence(draft, { setDraft }));
    const date = new Date();

    act(() => {
      result.current.toggleRecurrence();
      result.current.setUntil(date);
    });

    expect(setDraft).toHaveBeenCalled();
    expect(result.current.until).toEqual(date);
  });

  it("initializes with recurrence", () => {
    const draft = {
      ...baseDraft(),
      values: {
        ...baseDraft().values,
        recurrence: {
          kind: "series" as const,
          rules: ["RRULE:FREQ=MONTHLY;INTERVAL=2;COUNT=5"],
        },
      },
    } as GridEventDraft;

    const setDraft = mock();
    const { result } = renderHook(() => useRecurrence(draft, { setDraft }));

    expect(result.current.hasRecurrence).toBe(true);
    expect(result.current.freq).toBe(Frequency.MONTHLY);
    expect(result.current.interval).toBe(2);
  });

  it("re-seeds local state when series rules arrive after first render", () => {
    const seriesRules = ["RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TU,WE"];
    const source = createMockEvent({
      schedule: SCHEDULE,
      recurrence: {
        kind: "occurrence",
        seriesId: EventIdSchema.parse("0123456789abcdefaaaaaaaa"),
      },
    });
    const draft = editGridEventDraft(source);
    if (!draft) throw new Error("expected edit draft");

    const setDraft = mock();
    const { result, rerender } = renderHook(
      ({ rules }: { rules?: readonly string[] }) =>
        useRecurrence(draft, { setDraft }, rules),
      { initialProps: { rules: undefined as readonly string[] | undefined } },
    );

    expect(result.current.hasRecurrence).toBe(false);
    expect(result.current.freq).toBe(Frequency.DAILY);

    rerender({ rules: seriesRules });

    expect(result.current.hasRecurrence).toBe(true);
    expect(result.current.freq).toBe(Frequency.WEEKLY);
    expect(result.current.weekDays).toEqual(["monday", "tuesday", "wednesday"]);
    expect(setDraft).not.toHaveBeenCalled();
  });

  it("does not rewrite an unchanged recurring rule when the setter changes", () => {
    const source = createMockEvent({
      schedule: SCHEDULE,
      recurrence: {
        kind: "series",
        rules: ["RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=SU;COUNT=4"],
      },
    });
    const draft = editGridEventDraft(source);
    if (!draft) throw new Error("expected edit draft");

    const recurringDraft = {
      ...draft,
      values: {
        ...draft.values,
        recurrence: {
          kind: "series" as const,
          rules: ["RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=SU;COUNT=4"],
        },
      },
    } as GridEventDraft;

    const setDraft = mock();
    const nextSetDraft = mock();

    const { rerender } = renderHook(
      ({ setDraftProp }) =>
        useRecurrence(recurringDraft, { setDraft: setDraftProp }),
      {
        initialProps: { setDraftProp: setDraft },
      },
    );

    expect(setDraft).not.toHaveBeenCalled();

    rerender({ setDraftProp: nextSetDraft });

    expect(nextSetDraft).not.toHaveBeenCalled();
  });
});
