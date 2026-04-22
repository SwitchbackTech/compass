import { renderHook } from "@testing-library/react";
import { BehaviorSubject } from "rxjs";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const closeFloatingAtCursor = mock();
const resetActiveEvent = mock();
const resetDraft = mock();
const open$ = new BehaviorSubject(false);
const nodeId$ = new BehaviorSubject(null);
const placement$ = new BehaviorSubject("right-start");
const strategy$ = new BehaviorSubject("absolute");
const reference$ = new BehaviorSubject(null);

mock.module("@web/common/hooks/useOpenAtCursor", () => {
  return {
    closeFloatingAtCursor,
    open$,
    nodeId$,
    placement$,
    strategy$,
    reference$,
    openFloatingAtCursor: mock(),
    setFloatingOpenAtCursor: mock(),
    setFloatingNodeIdAtCursor: mock(),
    setFloatingPlacementAtCursor: mock(),
    setFloatingReferenceAtCursor: mock(),
    setFloatingStrategyAtCursor: mock(),
    isOpenAtCursor: mock(),
    CursorItem: {
      EventContextMenu: "EventContextMenu",
      EventForm: "EventForm",
      EventPreview: "EventPreview",
    },
  };
});

mock.module("@web/store/events", () => ({
  resetActiveEvent,
  resetDraft,
}));

const { useCloseEventForm } =
  require("@web/views/Forms/hooks/useCloseEventForm") as typeof import("@web/views/Forms/hooks/useCloseEventForm");

describe("useCloseEventForm", () => {
  beforeEach(() => {
    closeFloatingAtCursor.mockClear();
    resetActiveEvent.mockClear();
    resetDraft.mockClear();
  });

  it("should close floating at cursor and set draft to null", () => {
    const { result } = renderHook(() => useCloseEventForm());

    result.current();

    expect(closeFloatingAtCursor).toHaveBeenCalled();
    expect(resetDraft).toHaveBeenCalled();
    expect(resetActiveEvent).toHaveBeenCalled();
  });
});

afterAll(() => {
  mock.restore();
});
