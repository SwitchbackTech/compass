import "@testing-library/jest-dom";
import "fake-indexeddb/auto";
import { act, screen, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { type Schema_Event } from "@core/types/event.types";
import { compareEventsByStartDate } from "@web/common/utils/event/event.util";
import { eventsEntitiesSlice } from "@web/ducks/events/slices/event.slice";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { afterAll } from "bun:test";

const mockOpenEventForm = mock();
const mockRecipeInit = mock(() => ({}));
const mockSuperTokensInit = mock();
const mockUseOpenEventForm = mock();

mock.module("supertokens-web-js", () => ({
  default: {
    init: mockSuperTokensInit,
  },
}));

mock.module("supertokens-web-js/recipe/emailpassword", () => ({
  default: {
    init: mockRecipeInit,
  },
}));

mock.module("supertokens-web-js/recipe/emailverification", () => ({
  default: {
    init: mockRecipeInit,
  },
}));

mock.module("supertokens-web-js/recipe/thirdparty", () => ({
  default: {
    init: mockRecipeInit,
  },
}));

mock.module("supertokens-web-js/recipe/session", () => ({
  attemptRefreshingSession: mock(),
  default: {
    attemptRefreshingSession: mock(),
    doesSessionExist: mock().mockResolvedValue(true),
    getAccessToken: mock().mockResolvedValue("mock-access-token"),
    getAccessTokenPayloadSecurely: mock().mockResolvedValue({}),
    getInvalidClaimsFromResponse: mock().mockResolvedValue([]),
    getUserId: mock().mockResolvedValue("mock-user-id"),
    init: mockRecipeInit,
    signOut: mock().mockResolvedValue(undefined),
    validateClaims: mock().mockResolvedValue([]),
  },
}));

mock.module("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }: { children: ReactNode }) => children,
  useGoogleLogin: () => mock(),
}));

mock.module("@web/views/Forms/hooks/useOpenEventForm", () => ({
  useOpenEventForm: mockUseOpenEventForm,
}));

const { renderAgenda, selectIsDayEventsProcessingSpy } =
  require("@web/__tests__/utils/agenda/agenda.test.util") as typeof import("@web/__tests__/utils/agenda/agenda.test.util");

describe("CalendarAgenda", () => {
  beforeEach(() => {
    mockOpenEventForm.mockClear();
    mockUseOpenEventForm.mockClear();
    selectIsDayEventsProcessingSpy.mockClear();
    mockUseOpenEventForm.mockReturnValue(mockOpenEventForm);
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

    const screen = renderAgenda(mockEvents);

    await waitFor(() => {
      expect(screen.getByText("Event 1")).toBeInTheDocument();
      expect(screen.getByText("Event 2")).toBeInTheDocument();
    });
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

  it("should show progress line on subsequent loads after first load", async () => {
    const mockEvents: Schema_Event[] = [
      {
        _id: "event-1",
        title: "Test Event",
        startDate: "2024-01-15T10:00:00Z",
        endDate: "2024-01-15T11:00:00Z",
        isAllDay: false,
      },
    ];

    // First render with events loaded (not processing)
    const { store } = renderAgenda(mockEvents, { isProcessing: false });

    // Verify initial load shows events, not skeleton or progress line
    expect(await screen.findByText("Test Event")).toBeInTheDocument();
    expect(screen.queryByTestId("agenda-skeleton")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("loading-progress-line"),
    ).not.toBeInTheDocument();

    // Dispatch request action to simulate reload
    act(() => {
      selectIsDayEventsProcessingSpy.mockReturnValue(true);

      store.dispatch(
        eventsEntitiesSlice.actions.edit({
          _id: "event-1",
          event: {
            ...mockEvents[0],
            title: "Updated Title",
            startDate: mockEvents[0].startDate!,
            endDate: mockEvents[0].endDate!,
            user: "user-123",
            priority: "high",
            origin: "google",
          } as any,
        }),
      );
    });

    // On subsequent load after component has loaded once,
    // should show progress line not skeleton
    expect(
      await screen.findByTestId("loading-progress-line"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("agenda-skeleton")).not.toBeInTheDocument();
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

    const { user } = renderAgenda(mockEvents);

    await screen.findByLabelText("All-day events section");

    // Focus all-day section
    await user.tab();
    expect(document.activeElement).toHaveAttribute(
      "aria-label",
      "All-day events section",
    );

    await user.tab();

    expect(document.activeElement).toHaveTextContent(
      mockAllDayEventsByStartDate[0].title!,
    );

    await user.tab();

    expect(document.activeElement).toHaveTextContent(
      mockAllDayEventsByStartDate[1].title!,
    );

    // Focus timed section
    await user.tab();
    expect(document.activeElement).toHaveAttribute(
      "aria-label",
      "Timed events section",
    );

    await user.tab();

    expect(document.activeElement).toHaveTextContent(
      mockTimedEventsByStartDate[0].title!,
    );

    await user.tab();

    expect(document.activeElement).toHaveTextContent(
      mockTimedEventsByStartDate[1].title!,
    );
  });

  it("should open event form when pressing Enter on timed events section", async () => {
    const openEventFormMock = mock();
    mockUseOpenEventForm.mockReturnValue(openEventFormMock);

    const { user } = renderAgenda();

    const timedSection = await screen.findByLabelText("Timed events section");
    act(() => {
      timedSection.focus();
    });
    await user.keyboard("{Enter}");

    expect(openEventFormMock).toHaveBeenCalled();
  });

  it("should open event form when pressing Enter on all-day events section", async () => {
    const openEventFormMock = mock();
    mockUseOpenEventForm.mockReturnValue(openEventFormMock);

    const { user } = renderAgenda();

    const allDaySection = await screen.findByLabelText(
      "All-day events section",
    );
    act(() => {
      allDaySection.focus();
    });
    await user.keyboard("{Enter}");

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

    const firstRender = renderAgenda(mockEvents);

    expect(await screen.findByText("Event 1")).toBeInTheDocument();
    expect(await screen.findByText("Event 2")).toBeInTheDocument();

    firstRender.unmount();

    renderAgenda(mockEvents.slice(0, 1));

    expect(await screen.findByText("Event 1")).toBeInTheDocument();
    expect(screen.queryByText("Event 2")).not.toBeInTheDocument();
  });
});

afterAll(() => {
  mock.restore();
});
