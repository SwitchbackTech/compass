import {
  useClick,
  useDismiss,
  useFocus,
  useHover,
  useInteractions,
} from "@floating-ui/react";
import { renderHook } from "@testing-library/react";
import { useAgendaInteractionsAtCursor } from "@web/views/Day/hooks/events/useAgendaInteractionsAtCursor";

jest.mock("@floating-ui/react", () => ({
  useClick: jest.fn(),
  useDismiss: jest.fn(),
  useFocus: jest.fn(),
  useHover: jest.fn(),
  useInteractions: jest.fn(),
  safePolygon: jest.fn(() => jest.fn()),
}));

describe("useAgendaInteractionsAtCursor", () => {
  const mockFloating = {
    context: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call floating-ui hooks with correct params", () => {
    const mockClick = {};
    const mockHover = {};
    const mockFocus = {};
    const mockDismiss = {};
    const mockInteractions = { getReferenceProps: jest.fn() };

    (useClick as jest.Mock).mockReturnValue(mockClick);
    (useHover as jest.Mock).mockReturnValue(mockHover);
    (useFocus as jest.Mock).mockReturnValue(mockFocus);
    (useDismiss as jest.Mock).mockReturnValue(mockDismiss);
    (useInteractions as jest.Mock).mockReturnValue(mockInteractions);

    const { result } = renderHook(() =>
      useAgendaInteractionsAtCursor(mockFloating),
    );

    expect(useClick).toHaveBeenCalledWith(mockFloating.context, {
      toggle: false,
      stickIfOpen: true,
    });

    expect(useHover).toHaveBeenCalledWith(mockFloating.context, {
      handleClose: expect.any(Function), // safePolygon result
    });

    expect(useFocus).toHaveBeenCalledWith(mockFloating.context, {
      visibleOnly: true,
    });

    expect(useDismiss).toHaveBeenCalledWith(mockFloating.context, {
      outsidePress: false,
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
