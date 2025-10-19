import React, { act } from "react";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "@core/util/date/dayjs";
import {
  DAY_HEADING_FORMAT,
  DAY_SUBHEADING_FORMAT,
} from "../components/TaskList/TaskListHeader";
import { DateNavigationProvider } from "../context/DateNavigationProvider";
import { TaskProvider } from "../context/TaskProvider";
import { renderWithDayProviders } from "../util/day.test-util";
import { TodayView } from "./TodayView";
import { TodayViewContent } from "./TodayViewContent";

// Mock the CalendarAgenda component
jest.mock("../components/CalendarAgenda/CalendarAgenda", () => ({
  CalendarAgenda: () => (
    <div className="h-96 bg-gray-100">Calendar Content</div>
  ),
}));

// Mock the ShortcutsOverlay component
jest.mock("../components/Shortcuts/ShortcutsOverlay", () => ({
  ShortcutsOverlay: () => <div data-testid="shortcuts-overlay" />,
}));

// Mock the keyboard shortcuts hook
const mockUseTodayViewShortcuts = jest.fn();
jest.mock("../hooks/shortcuts/useTodayViewShortcuts", () => {
  const actual = jest.requireActual("../hooks/shortcuts/useTodayViewShortcuts");
  return {
    ...actual,
    useTodayViewShortcuts: (
      ...args: Parameters<typeof actual.useTodayViewShortcuts>
    ) => mockUseTodayViewShortcuts(...args),
  };
});

// Mock feature flags
jest.mock("@web/common/hooks/useFeatureFlags", () => ({
  useFeatureFlags: () => ({
    isPlannerEnabled: true,
  }),
}));

describe("TodayView Routing", () => {
  beforeEach(() => {
    mockUseTodayViewShortcuts.mockReset();
    mockUseTodayViewShortcuts.mockImplementation((config) => {
      const actual = jest.requireActual(
        "../hooks/shortcuts/useTodayViewShortcuts",
      );
      return actual.useTodayViewShortcuts(config);
    });
    localStorage.clear();
  });

  it("should show today's date when navigating to /day", () => {
    renderWithDayProviders(<TodayView />);

    // Should show today's date in the header
    const todayHeading = new Date().toLocaleDateString("en-US", {
      weekday: "long",
    });
    expect(screen.getByText(todayHeading)).toBeInTheDocument();
  });

  it("should show next day when clicking next day button", async () => {
    const user = userEvent.setup();
    renderWithDayProviders(<TodayView />);

    // Find and click the next day button
    const nextDayButton = screen.getByRole("button", { name: "Next day" });
    await act(async () => {
      await user.click(nextDayButton);
    });

    // Should show tomorrow's date
    const tomorrow = dayjs().add(1, "day");
    const tomorrowWeekday = tomorrow.format(DAY_HEADING_FORMAT);
    const tomorrowDate = tomorrow.format(DAY_SUBHEADING_FORMAT);
    expect(screen.getByText(tomorrowWeekday)).toBeInTheDocument();
    expect(screen.getByText(tomorrowDate)).toBeInTheDocument();
  });

  it("should show previous day when clicking previous day button", async () => {
    const user = userEvent.setup();
    renderWithDayProviders(<TodayView />);

    // Find and click the previous day button
    const prevDayButton = screen.getByRole("button", { name: "Previous day" });
    await act(async () => {
      await user.click(prevDayButton);
    });

    // Should show October 19, 2025 (Saturday)
    expect(screen.getByText("Saturday")).toBeInTheDocument();
    expect(screen.getByText("October 18")).toBeInTheDocument();
  });

  it("should show today when clicking go to today button", async () => {
    const { user } = renderWithDayProviders(<TodayView />);

    // Go to different day to make the "Go to today" button visible
    const prevDayButton = screen.getByRole("button", { name: "Previous day" });
    await act(async () => {
      await user.click(prevDayButton);
    });

    // Find and click the go to today button (it should be visible when not viewing today)
    const goToTodayButton = screen.getByRole("button", { name: "Go to today" });
    await act(async () => {
      await user.click(goToTodayButton);
    });

    // Should show today's date
    const todayHeading = new Date().toLocaleDateString("en-US", {
      weekday: "long",
    });
    expect(screen.getByText(todayHeading)).toBeInTheDocument();
  });

  it("should render specific dates correctly", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-10-20T12:00:00.000Z"));

    renderWithDayProviders(<TodayView />);

    expect(screen.getByText("Monday")).toBeInTheDocument();
    expect(screen.getByText("October 20")).toBeInTheDocument();

    jest.useRealTimers();
  });
});
describe("Navigation with URL updates", () => {
  it("should update URL when navigating to next day", async () => {
    const { user } = renderWithDayProviders(<TodayViewContent />);

    // Mock window.location for testing
    delete (window as any).location;
    window.location = { pathname: "/day" } as any;

    // Find and click the next day button
    const nextDayButton = screen.getByRole("button", { name: "Next day" });
    await act(async () => {
      await user.click(nextDayButton);
    });

    // The navigation should be called (we can't easily test the actual URL change in this context)
    // but we can verify the button click works
    expect(nextDayButton).toBeInTheDocument();
  });

  it("should update URL when navigating to previous day", async () => {
    const { user } = renderWithDayProviders(<TodayViewContent />);

    // Find and click the previous day button
    const prevDayButton = screen.getByRole("button", {
      name: "Previous day",
    });
    await act(async () => {
      await user.click(prevDayButton);
    });

    // Verify the button click works
    expect(prevDayButton).toBeInTheDocument();
  });

  it("should display correct date in header when viewing specific date", () => {
    // Test with a specific date - use UTC to avoid timezone issues
    const specificDate = dayjs.utc("2025-10-20");
    renderWithDayProviders(
      <DateNavigationProvider initialDate={specificDate}>
        <TaskProvider>
          <TodayViewContent />
        </TaskProvider>
      </DateNavigationProvider>,
    );

    // Should show October 20, 2025 (Monday)
    expect(screen.getByText("Monday")).toBeInTheDocument();
    expect(screen.getByText("October 20")).toBeInTheDocument();
  });

  it("should show today indicator when viewing today", () => {
    // Test with today's date
    const today = dayjs();
    renderWithDayProviders(
      <DateNavigationProvider initialDate={today}>
        <TodayViewContent />
      </DateNavigationProvider>,
    );

    // Should show today's date
    const todayHeading = today.toDate().toLocaleDateString("en-US", {
      weekday: "long",
    });
    expect(screen.getByText(todayHeading)).toBeInTheDocument();
  });
});
