import { renderHook } from "@testing-library/react";
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
  });

  it("should discard the draft (which closes the form)", () => {
    const { result } = renderHook(() => useCloseEventForm());

    result.current();

    expect(dispatch).toHaveBeenCalledWith(
      draftSlice.actions.discard(undefined),
    );
  });
});
