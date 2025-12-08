import { act } from "react";
import { renderHook } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import { getUserId } from "@web/auth/auth.util";
import {
  CLASS_TIMED_CALENDAR_EVENT,
  DATA_EVENT_ELEMENT_ID,
} from "@web/common/constants/web.constants";
import { useMousePosition } from "@web/common/hooks/useMousePosition";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import { SLOT_HEIGHT } from "@web/views/Day/constants/day.constants";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { getEventTimeFromPosition } from "@web/views/Day/util/agenda/agenda.util";
import { useOpenEventForm } from "../useOpenEventForm";

jest.mock("@web/common/hooks/useMousePosition");
jest.mock("@web/views/Day/hooks/navigation/useDateInView");
jest.mock("@web/auth/auth.util");
jest.mock("@web/ducks/events/selectors/event.selectors");
jest.mock("@web/views/Day/util/agenda/agenda.util");
jest.mock("@web/store", () => ({
  store: {
    getState: jest.fn(),
  },
}));

describe("useOpenEventForm", () => {
  const mockSetDraft = jest.fn();
  const mockSetExisting = jest.fn();
  const mockSetOpenAtMousePosition = jest.fn();
  const mockSetReference = jest.fn();
  const mockDateInView = dayjs("2023-01-01T12:00:00.000Z");

  beforeEach(() => {
    jest.clearAllMocks();
    (useDateInView as jest.Mock).mockReturnValue(mockDateInView);
    (getUserId as jest.Mock).mockResolvedValue("user-123");
    (useMousePosition as jest.Mock).mockReturnValue({
      element: null,
      mousePointRef: { getBoundingClientRect: jest.fn(() => ({ top: 100 })) },
      floating: { refs: { setReference: mockSetReference } },
      setOpenAtMousePosition: mockSetOpenAtMousePosition,
      isOverAllDayRow: false,
      isOverMainGrid: false,
      isOverSidebar: false,
      isOverSomedayWeek: false,
      isOverSomedayMonth: false,
    });
  });

  it("should not open form if user is not logged in", async () => {
    (getUserId as jest.Mock).mockResolvedValue(null);
    const { result } = renderHook(() =>
      useOpenEventForm({
        setDraft: mockSetDraft,
        setExisting: mockSetExisting,
      }),
    );

    await act(async () => {
      await result.current();
    });

    expect(mockSetDraft).not.toHaveBeenCalled();
  });

  it("should create a new draft event when not hovering over existing event", async () => {
    const { result } = renderHook(() =>
      useOpenEventForm({
        setDraft: mockSetDraft,
        setExisting: mockSetExisting,
      }),
    );

    await act(async () => {
      await result.current();
    });

    expect(mockSetExisting).toHaveBeenCalledWith(false);
    expect(mockSetDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "",
        user: "user-123",
        origin: Origin.COMPASS,
        priority: Priorities.UNASSIGNED,
      }),
    );
    expect(mockSetOpenAtMousePosition).toHaveBeenCalledWith(true);
  });

  it("should create all-day event when hovering over all-day row", async () => {
    (useMousePosition as jest.Mock).mockReturnValue({
      ...useMousePosition(),
      isOverAllDayRow: true,
    });

    const { result } = renderHook(() =>
      useOpenEventForm({
        setDraft: mockSetDraft,
        setExisting: mockSetExisting,
      }),
    );

    await act(async () => {
      await result.current();
    });

    expect(mockSetDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        isAllDay: true,
        startDate: mockDateInView.startOf("day").toISOString(),
        endDate: mockDateInView.startOf("day").add(1, "day").toISOString(),
      }),
    );
  });

  it("should create timed event when hovering over main grid", async () => {
    (useMousePosition as jest.Mock).mockReturnValue({
      ...useMousePosition(),
      isOverMainGrid: true,
      mousePointRef: { getBoundingClientRect: () => ({ top: 100 }) },
    });
    (getEventTimeFromPosition as jest.Mock).mockImplementation((y) => {
      if (y === 100) return mockDateInView.hour(10).minute(0);
      if (y === 100 + SLOT_HEIGHT) return mockDateInView.hour(10).minute(15);
      return mockDateInView;
    });

    const { result } = renderHook(() =>
      useOpenEventForm({
        setDraft: mockSetDraft,
        setExisting: mockSetExisting,
      }),
    );

    await act(async () => {
      await result.current();
    });

    expect(mockSetDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        isAllDay: false,
        startDate: mockDateInView.hour(10).minute(0).toISOString(),
        endDate: mockDateInView.hour(10).minute(15).toISOString(),
      }),
    );
  });

  it("should open existing event when hovering over one", async () => {
    const mockEventElement = document.createElement("div");
    mockEventElement.setAttribute(DATA_EVENT_ELEMENT_ID, "event-123");
    mockEventElement.classList.add(CLASS_TIMED_CALENDAR_EVENT);

    (useMousePosition as jest.Mock).mockReturnValue({
      ...useMousePosition(),
      isOverMainGrid: true,
      element: { closest: jest.fn().mockReturnValue(mockEventElement) },
    });
    const mockEvent = { _id: "event-123", title: "Existing Event" };
    (selectEventById as jest.Mock).mockReturnValue(mockEvent);

    const { result } = renderHook(() =>
      useOpenEventForm({
        setDraft: mockSetDraft,
        setExisting: mockSetExisting,
      }),
    );

    await act(async () => {
      await result.current();
    });

    expect(mockSetExisting).toHaveBeenCalledWith(true);
    expect(mockSetDraft).toHaveBeenCalledWith(mockEvent);
    expect(mockSetOpenAtMousePosition).toHaveBeenCalledWith(true);
  });

  it("should create new event even if hovering over existing event when create=true is passed", async () => {
    const mockEventElement = document.createElement("div");
    mockEventElement.setAttribute(DATA_EVENT_ELEMENT_ID, "event-123");
    mockEventElement.classList.add(CLASS_TIMED_CALENDAR_EVENT);

    (useMousePosition as jest.Mock).mockReturnValue({
      ...useMousePosition(),
      isOverMainGrid: true,
      element: { closest: jest.fn().mockReturnValue(mockEventElement) },
    });

    const { result } = renderHook(() =>
      useOpenEventForm({
        setDraft: mockSetDraft,
        setExisting: mockSetExisting,
      }),
    );

    await act(async () => {
      await result.current(true); // Pass create=true
    });

    expect(mockSetExisting).toHaveBeenCalledWith(false);
    expect(mockSetDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "",
        user: "user-123",
      }),
    );
  });
});
