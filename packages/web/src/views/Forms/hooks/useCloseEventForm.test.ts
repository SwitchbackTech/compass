import { renderHook } from "@testing-library/react";
import { closeFloatingAtCursor } from "@web/common/hooks/useOpenAtCursor";
import { resetActiveEvent, resetDraft } from "@web/store/events";
import { useCloseEventForm } from "@web/views/Forms/hooks/useCloseEventForm";

jest.mock("@web/common/hooks/useOpenAtCursor");
jest.mock("@web/store/events", () => ({
  resetDraft: jest.fn(),
  resetActiveEvent: jest.fn(),
}));

describe("useCloseEventForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should close floating at cursor and set draft to null", () => {
    const { result } = renderHook(() => useCloseEventForm());

    result.current();

    expect(closeFloatingAtCursor).toHaveBeenCalled();
    expect(resetDraft).toHaveBeenCalled();
    expect(resetActiveEvent).toHaveBeenCalled();
  });
});
