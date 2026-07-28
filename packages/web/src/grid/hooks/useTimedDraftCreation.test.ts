import { act, renderHook } from "@testing-library/react";
import { type MouseEvent as ReactMouseEvent } from "react";
import dayjs from "@core/util/date/dayjs";
import { draftActions, useDraftStore } from "@web/events/stores/draft.store";
import { useTimedDraftCreation } from "./useTimedDraftCreation";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const START_OF_VIEW = dayjs("2024-01-16T10:00:00.000Z");

const getStartDate = ({ x }: { x: number; y: number }) =>
  START_OF_VIEW.add(Math.floor(x / 100), "day");

const fakeMouseDown = (clientX: number) =>
  ({
    altKey: false,
    button: 0,
    clientX,
    clientY: 0,
    ctrlKey: false,
    metaKey: false,
    preventDefault: mock(),
    shiftKey: false,
    stopPropagation: mock(),
  }) as unknown as ReactMouseEvent<HTMLElement>;

// A plain click: mousedown (via the hook's own API) followed by an immediate
// mouseup at the same point, dispatched the way the hook's real window
// listener receives it.
const releaseMouse = (clientX: number) => {
  window.dispatchEvent(
    new MouseEvent("mouseup", { bubbles: true, cancelable: true, clientX }),
  );
};

describe("useTimedDraftCreation", () => {
  beforeEach(() => {
    draftActions.discard();
  });

  it("starts a new draft at the new point instead of swallowing the click when one is already open", () => {
    const onFinish = mock();
    const { result } = renderHook(() =>
      useTimedDraftCreation({ getStartDate, onFinish }),
    );

    act(() => {
      result.current.startTimedDraftCreation(fakeMouseDown(0));
      releaseMouse(0);
    });

    expect(onFinish).toHaveBeenCalledTimes(1);
    const firstDraft = onFinish.mock.calls[0]![0];

    // Mirror what real callers do in onFinish: open the draft in the store.
    act(() => {
      draftActions.startGridDraft({ activity: "gridClick", draft: firstDraft });
    });
    expect(useDraftStore.getState().status?.isDrafting).toBe(true);

    act(() => {
      result.current.startTimedDraftCreation(fakeMouseDown(300));
      releaseMouse(300);
    });

    // The stale draft must be dropped...
    expect(useDraftStore.getState().gridDraft).toBeNull();
    // ...and a fresh one created at the new point, not just discarded.
    expect(onFinish).toHaveBeenCalledTimes(2);
    const secondDraft = onFinish.mock.calls[1]![0];
    expect(
      dayjs(secondDraft.values.schedule.start).isSame(
        START_OF_VIEW.add(3, "day"),
      ),
    ).toBe(true);
  });
});
