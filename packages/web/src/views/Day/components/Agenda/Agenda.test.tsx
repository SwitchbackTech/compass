import { act } from "react";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { Schema_Event } from "@core/types/event.types";
import { createStoreWithEvents } from "@web/__tests__/utils/state/store.test.util";
import { compareEventsByStartDate } from "@web/common/utils/event/event.util";
import { Agenda } from "@web/views/Day/components/Agenda/Agenda";
import { renderWithDayProviders } from "@web/views/Day/util/day.test-util";
import { useOpenEventForm } from "@web/views/Forms/hooks/useOpenEventForm";

jest.mock("@web/auth/auth.util", () => ({
  getUserId: jest.fn().mockResolvedValue("user-123"),
}));

jest.mock("@web/views/Forms/hooks/useOpenEventForm");

const renderAgenda = (
  events: Schema_Event[] = [],
  options?: { isProcessing?: boolean },
) => {
  const store = createStoreWithEvents(events, options);
  const utils = renderWithDayProviders(<Agenda />, { store });
  return { ...utils, store };
};

describe("CalendarAgenda", () => {
  beforeEach(() => {
    (useOpenEventForm as jest.Mock).mockReturnValue(jest.fn());
  });

  it("should render time labels", async () => {
    renderAgenda();

    expect(await screen.findByText("12am")).toBeInTheDocument();
    expect(await screen.findByText("12pm")).toBeInTheDocument();
    expect(await screen.findByText("6am")).toBeInTheDocument();
    expect(await screen.findByText("6pm")).toBeInTheDocument();
  });

  it("should render multiple events", async () => {
    const mockEvents: Schema_Event[] = [
      {
        _id: "event-1",
        title: "Event 1",
        startDate: "2024-01-15T09:00:00Z",
        endDate: "2024-01-15T10:00:00Z",
        isAllDay: false,
      },
      {
        _id: "event-2",
        title: "Event 2",
        startDate: "2024-01-15T14:00:00Z",
        endDate: "2024-01-15T15:00:00Z",
        isAllDay: false,
      },
    ];

    renderAgenda(mockEvents);

    expect(await screen.findByText("Event 1")).toBeInTheDocument();
    expect(await screen.findByText("Event 2")).toBeInTheDocument();
  });

  it("should render all-day events", async () => {
    const mockEvents: Schema_Event[] = [
      {
        _id: "event-all-day",
        title: "All Day Event",
        startDate: "2024-01-15T00:00:00Z",
        endDate: "2024-01-15T23:59:59Z",
        isAllDay: true,
      },
    ];

    renderAgenda(mockEvents);

    expect(await screen.findByText("All Day Event")).toBeInTheDocument();
  });

  it("should show skeleton during loading", async () => {
    renderAgenda([], { isProcessing: true });

    const skeleton = await screen.findByTestId("agenda-skeleton");
    expect(skeleton).toBeInTheDocument();
  });

  it("should not show skeleton or error when events are loaded", async () => {
    const mockEvents: Schema_Event[] = [
      {
        _id: "event-1",
        title: "Test Event",
        startDate: "2024-01-15T10:00:00Z",
        endDate: "2024-01-15T11:00:00Z",
        isAllDay: false,
      },
    ];

    renderAgenda(mockEvents);

    const skeletonElements = document.querySelectorAll(".animate-pulse");
    expect(skeletonElements).toHaveLength(0);
    expect(screen.queryByText("Failed to load events")).not.toBeInTheDocument();
    expect(await screen.findByText("Test Event")).toBeInTheDocument();
  });

  it("should render events with correct tabIndex and data attributes", async () => {
    const mockEvents: Schema_Event[] = [
      {
        _id: "all-day-1",
        title: "All Day Event 1",
        startDate: "2024-01-15T00:00:00Z",
        endDate: "2024-01-15T23:59:59Z",
        isAllDay: true,
      },
      {
        _id: "timed-1",
        title: "Timed Event 1",
        startDate: "2024-01-15T09:00:00Z",
        endDate: "2024-01-15T10:00:00Z",
        isAllDay: false,
      },
    ];

    renderAgenda(mockEvents);

    const allDayEvent = await screen.findByRole("button", {
      name: "All Day Event 1",
    });
    expect(allDayEvent).toHaveAttribute("tabIndex", "0");
    expect(allDayEvent).toHaveAttribute("role", "button");
    expect(allDayEvent).toHaveAttribute("data-event-id", "all-day-1");

    const timedEvent = await screen.findByRole("button", {
      name: "Timed Event 1",
    });
    expect(timedEvent).toHaveAttribute("tabIndex", "0");
    expect(timedEvent).toHaveAttribute("role", "button");
  });

  it("should render events in correct TAB navigation order", async () => {
    const mockEvents: Schema_Event[] = [
      {
        _id: "all-day-2",
        title: "Zebra Event",
        startDate: "2024-01-15T00:00:00Z",
        endDate: "2024-01-15T23:59:59Z",
        isAllDay: true,
      },
      {
        _id: "all-day-1",
        title: "Apple Event",
        startDate: "2024-01-15T00:00:00Z",
        endDate: "2024-01-15T23:59:59Z",
        isAllDay: true,
      },
      {
        _id: "timed-2",
        title: "Lunch Event",
        startDate: "2024-01-15T12:00:00Z",
        endDate: "2024-01-15T13:00:00Z",
        isAllDay: false,
      },
      {
        _id: "timed-1",
        title: "Breakfast Event",
        startDate: "2024-01-15T08:00:00Z",
        endDate: "2024-01-15T09:00:00Z",
        isAllDay: false,
      },
    ];

    const mockEventsByStartDate = [...mockEvents].sort(
      compareEventsByStartDate,
    );

    const mockAllDayEventsByStartDate = mockEventsByStartDate.filter(
      (e) => e.isAllDay,
    );

    const mockTimedEventsByStartDate = mockEventsByStartDate.filter(
      (e) => !e.isAllDay,
    );

    const { user } = await act(() => renderAgenda(mockEvents));

    // Focus all-day section
    await act(async () => {
      await user.tab();
    });
    expect(document.activeElement).toHaveAttribute(
      "aria-label",
      "All-day events section",
    );

    await act(async () => {
      await user.tab();
    });

    expect(document.activeElement).toHaveTextContent(
      mockAllDayEventsByStartDate[0].title!,
    );

    await act(async () => {
      await user.tab();
    });

    expect(document.activeElement).toHaveTextContent(
      mockAllDayEventsByStartDate[1].title!,
    );

    // Focus timed section
    await act(async () => {
      await user.tab();
    });
    expect(document.activeElement).toHaveAttribute(
      "aria-label",
      "Timed events section",
    );

    await act(async () => {
      await user.tab();
    });

    expect(document.activeElement).toHaveTextContent(
      mockTimedEventsByStartDate[0].title!,
    );

    await act(async () => {
      await user.tab();
    });

    expect(document.activeElement).toHaveTextContent(
      mockTimedEventsByStartDate[1].title!,
    );
  });

  it("should open event form when pressing Enter on timed events section", async () => {
    const openEventFormMock = jest.fn();
    (useOpenEventForm as jest.Mock).mockReturnValue(openEventFormMock);

    const { user } = await act(() => renderAgenda());

    const timedSection = screen.getByLabelText("Timed events section");
    await act(async () => {
      timedSection.focus();
      await user.keyboard("{Enter}");
    });

    expect(openEventFormMock).toHaveBeenCalled();
  });

  it("should open event form when pressing Enter on all-day events section", async () => {
    const openEventFormMock = jest.fn();
    (useOpenEventForm as jest.Mock).mockReturnValue(openEventFormMock);

    const { user } = await act(() => renderAgenda());

    const allDaySection = screen.getByLabelText("All-day events section");
    await act(async () => {
      allDaySection.focus();
      await user.keyboard("{Enter}");
    });

    expect(openEventFormMock).toHaveBeenCalled();
  });

  it("should filter out deleted events immediately", async () => {
    const mockEvents: Schema_Event[] = [
      {
        _id: "event-1",
        title: "Event 1",
        startDate: "2024-01-15T09:00:00Z",
        endDate: "2024-01-15T10:00:00Z",
        isAllDay: false,
      },
      {
        _id: "event-2",
        title: "Event 2",
        startDate: "2024-01-15T14:00:00Z",
        endDate: "2024-01-15T15:00:00Z",
        isAllDay: false,
      },
    ];

    const firstRender = await act(() => renderAgenda(mockEvents));

    expect(await screen.findByText("Event 1")).toBeInTheDocument();
    expect(await screen.findByText("Event 2")).toBeInTheDocument();

    firstRender.unmount();

    await act(() => renderAgenda(mockEvents.slice(0, 1)));

    expect(await screen.findByText("Event 1")).toBeInTheDocument();
    expect(screen.queryByText("Event 2")).not.toBeInTheDocument();
  });
});
