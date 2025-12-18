import { renderHook } from "@testing-library/react";
import { closeFloatingAtCursor } from "@web/common/hooks/useOpenAtCursor";
import { setDraft } from "@web/views/Calendar/components/Draft/context/useDraft";
import { useCloseEventForm } from "@web/views/Forms/hooks/useCloseEventForm";

jest.mock("@web/common/hooks/useOpenAtCursor");
jest.mock("@web/views/Calendar/components/Draft/context/useDraft");

describe("useCloseEventForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should close floating at cursor and set draft to null", () => {
    const { result } = renderHook(() => useCloseEventForm());

    result.current();

    expect(closeFloatingAtCursor).toHaveBeenCalled();
    expect(setDraft).toHaveBeenCalledWith(null);
  });
});
