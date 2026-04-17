import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockSafePolygonResult = mock();
const useClick = mock();
const useDismiss = mock();
const useFocus = mock();
const useHover = mock();
const useInteractions = mock();

mock.module("@floating-ui/react", () => ({
  safePolygon: mock(() => mockSafePolygonResult),
  useClick,
  useDismiss,
  useFocus,
  useHover,
  useInteractions,
}));

const { useAgendaInteractionsAtCursor } =
  require("@web/views/Day/hooks/events/useAgendaInteractionsAtCursor") as typeof import("@web/views/Day/hooks/events/useAgendaInteractionsAtCursor");

describe("useAgendaInteractionsAtCursor", () => {
  const mockFloating = {
    context: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  beforeEach(() => {
    mockSafePolygonResult.mockClear();
    useClick.mockClear();
    useDismiss.mockClear();
    useFocus.mockClear();
    useHover.mockClear();
    useInteractions.mockClear();
  });

  it("should call floating-ui hooks with correct params", () => {
    const mockClick = {};
    const mockHover = {};
    const mockFocus = {};
    const mockDismiss = {};
    const mockInteractions = { getReferenceProps: mock() };

    useClick.mockReturnValue(mockClick);
    useHover.mockReturnValue(mockHover);
    useFocus.mockReturnValue(mockFocus);
    useDismiss.mockReturnValue(mockDismiss);
    useInteractions.mockReturnValue(mockInteractions);

    const { result } = renderHook(() =>
      useAgendaInteractionsAtCursor(mockFloating),
    );

    expect(useClick).toHaveBeenCalledWith(mockFloating.context, {
      toggle: true,
      stickIfOpen: true,
    });

    expect(useHover).toHaveBeenCalledWith(mockFloating.context, {
      handleClose: expect.any(Function), // safePolygon result
    });

    expect(useFocus).toHaveBeenCalledWith(mockFloating.context, {
      visibleOnly: true,
    });

    expect(useDismiss).toHaveBeenCalledWith(mockFloating.context, {
      enabled: undefined,
    });

    expect(useInteractions).toHaveBeenCalledWith([
      mockClick,
      mockFocus,
      mockHover,
      mockDismiss,
    ]);

    expect(result.current).toBe(mockInteractions);
  });
});
