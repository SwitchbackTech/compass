import { renderHook } from "@testing-library/react";
import {
  CursorItem,
  closeFloatingAtCursor,
  isOpenAtCursor,
  setFloatingNodeIdAtCursor,
  setFloatingOpenAtCursor,
  setFloatingReferenceAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { createUseCloseEventForm } from "./useCloseEventForm.factory";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const dispatch = mock();
const useCloseEventForm = createUseCloseEventForm({
  useAppDispatch: () => dispatch,
});

describe("useCloseEventForm", () => {
  beforeEach(() => {
    dispatch.mockClear();
    closeFloatingAtCursor();
  });

  it("should close floating at cursor and set draft to null", () => {
    const { result } = renderHook(() => useCloseEventForm());
    const reference = document.createElement("div");

    setFloatingNodeIdAtCursor(CursorItem.EventForm);
    setFloatingReferenceAtCursor(reference);
    setFloatingOpenAtCursor(true);

    result.current();

    expect(isOpenAtCursor(CursorItem.EventForm)).toBe(false);
    expect(dispatch).toHaveBeenCalledWith(
      draftSlice.actions.discard(undefined),
    );
  });
});
