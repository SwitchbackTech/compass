import { Subject } from "rxjs";
import { OpenChangeReason } from "@floating-ui/react";
import { renderHook } from "@testing-library/react";
import { useMousePosition } from "@web/common/hooks/useMousePosition";
import { useCloseEventForm } from "../useCloseEventForm";

jest.mock("@web/common/hooks/useMousePosition");

describe("useCloseEventForm", () => {
  const mockSetDraft = jest.fn();
  const mockSetOpenAtMousePosition = jest.fn();
  const mockOpenChange$ = new Subject<
    [boolean, Event | undefined, OpenChangeReason | undefined]
  >();

  beforeEach(() => {
    jest.clearAllMocks();
    (useMousePosition as jest.Mock).mockReturnValue({
      setOpenAtMousePosition: mockSetOpenAtMousePosition,
      openChange$: mockOpenChange$,
    });
  });

  it("should set openAtMousePosition to false when called", () => {
    const { result } = renderHook(() =>
      useCloseEventForm({ setDraft: mockSetDraft }),
    );

    result.current();

    expect(mockSetOpenAtMousePosition).toHaveBeenCalledWith(false);
  });

  it("should set draft to null when openChange$ emits false", () => {
    renderHook(() => useCloseEventForm({ setDraft: mockSetDraft }));

    mockOpenChange$.next([false, undefined, undefined]);

    expect(mockSetDraft).toHaveBeenCalledWith(null);
  });

  it("should not set draft to null when openChange$ emits true", () => {
    renderHook(() => useCloseEventForm({ setDraft: mockSetDraft }));

    mockOpenChange$.next([true, undefined, undefined]);

    expect(mockSetDraft).not.toHaveBeenCalled();
  });
});
