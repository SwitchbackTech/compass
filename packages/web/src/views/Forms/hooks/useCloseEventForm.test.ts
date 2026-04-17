import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const closeFloatingAtCursor = mock();
const resetActiveEvent = mock();
const resetDraft = mock();

mock.module("@web/common/hooks/useOpenAtCursor", () => ({
  closeFloatingAtCursor,
}));

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
