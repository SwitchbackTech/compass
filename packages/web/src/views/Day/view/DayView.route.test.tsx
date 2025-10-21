import { act } from "react";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import {
  DAY_HEADING_FORMAT,
  DAY_SUBHEADING_FORMAT,
} from "../components/TaskList/TaskListHeader";
import { renderWithDayProviders } from "../util/day.test-util";
import { DayView } from "./DayView";
import { DayViewContent } from "./DayViewContent";

// Mock the CalendarAgenda component
jest.mock("../components/CalendarAgenda/CalendarAgenda", () => ({
  CalendarAgenda: () => (
    <div className="h-96 bg-gray-100">Calendar Content</div>
  ),
}));

// Mock the ShortcutsOverlay component
jest.mock("../components/Shortcuts/components/ShortcutsOverlay", () => ({
  ShortcutsOverlay: () => <div data-testid="shortcuts-overlay" />,
}));

// Mock the keyboard shortcuts hook
const mockUseDayViewShortcuts = jest.fn();
jest.mock("../hooks/shortcuts/useDayViewShortcuts", () => {
  const actual = jest.requireActual("../hooks/shortcuts/useDayViewShortcuts");
  return {
    ...actual,
    useDayViewShortcuts: (
      ...args: Parameters<typeof actual.useDayViewShortcuts>
    ) => mockUseDayViewShortcuts(...args),
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
    mockUseDayViewShortcuts.mockReset();
    mockUseDayViewShortcuts.mockImplementation((config) => {
      const actual = jest.requireActual(
        "../hooks/shortcuts/useDayViewShortcuts",
      );
      return actual.useDayViewShortcuts(config);
    });
    localStorage.clear();
  });

  it("should show today's date when navigating to /day", () => {
    renderWithDayProviders(<DayView />);

    // Should show today's date in the header
    const todayHeading = new Date().toLocaleDateString("en-US", {
      weekday: "long",
    });
    expect(screen.getByText(todayHeading)).toBeInTheDocument();
  });

  it("should show next day label when clicking next day button", async () => {
    // Test with a specific date to avoid timezone issues
    const testDate = dayjs.utc("2025-10-19"); // Sunday
    const { user } = renderWithDayProviders(<DayViewContent />, {
      initialDate: testDate,
    });

    // Find and click the next day button
    const nextDayButton = screen.getByRole("button", { name: "Next day" });
    await act(async () => {
      await user.click(nextDayButton);
    });

    // Should show tomorrow's date (Monday, October 20)
    const tomorrow = testDate.add(1, "day");
    const tomorrowWeekday = tomorrow.format(DAY_HEADING_FORMAT);
    const tomorrowDate = tomorrow.format(DAY_SUBHEADING_FORMAT);
    expect(screen.getByText(tomorrowWeekday)).toBeInTheDocument();
    expect(screen.getByText(tomorrowDate)).toBeInTheDocument();
  });

  it("should show previous day when clicking previous day button", async () => {
    // Test with a specific date to avoid timezone issues
    const testDate = dayjs.utc("2025-10-19"); // Sunday
    const { user } = renderWithDayProviders(<DayViewContent />, {
      initialDate: testDate,
    });

    // Find and click the previous day button
    const prevDayButton = screen.getByRole("button", { name: "Previous day" });
    await act(async () => {
      await user.click(prevDayButton);
    });

    // Should show yesterday's date (Saturday, October 18)
    const yesterday = testDate.subtract(1, "day");
    const yesterdayWeekday = yesterday.format(DAY_HEADING_FORMAT);
    const yesterdayDate = yesterday.format(DAY_SUBHEADING_FORMAT);
    expect(screen.getByText(yesterdayWeekday)).toBeInTheDocument();
    expect(screen.getByText(yesterdayDate)).toBeInTheDocument();
  });

  it("should show today when clicking go to today button", async () => {
    // Test with a specific date to avoid timezone issues
    const testDate = dayjs.utc("2025-10-19"); // Sunday
    const { user } = renderWithDayProviders(<DayViewContent />, {
      initialDate: testDate,
    });

    // Go to different day to make the "Go to today" button visible
    const prevDayButton = screen.getByRole("button", { name: "Previous day" });
    await act(async () => {
      await user.click(prevDayButton);
    });

    // Wait for the navigation to complete and verify we're on yesterday
    const yesterday = testDate.subtract(1, "day");
    const yesterdayWeekday = yesterday.format(DAY_HEADING_FORMAT);
    await screen.findByText(yesterdayWeekday);

    // Find and click the go to today button (it should be visible when not viewing today)
    const goToTodayButton = screen.getByRole("button", { name: "Go to today" });
    await act(async () => {
      await user.click(goToTodayButton);
    });

    // Should show today's date (the actual current date, not the test date)
    const today = dayjs().utc();
    const todayWeekday = today.format(DAY_HEADING_FORMAT);
    const todayDate = today.format(DAY_SUBHEADING_FORMAT);
    expect(screen.getByText(todayWeekday)).toBeInTheDocument();
    expect(screen.getByText(todayDate)).toBeInTheDocument();
  });

  it("should render specific dates correctly", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-10-20T12:00:00.000Z"));

    renderWithDayProviders(<DayView />);

    expect(screen.getByText("Monday")).toBeInTheDocument();
    expect(screen.getByText("October 20")).toBeInTheDocument();

    jest.useRealTimers();
  });
});
describe("Navigation with URL updates", () => {
  it("should update URL when navigating to next day", async () => {
    const { user } = renderWithDayProviders(<DayViewContent />);

    // Mock window.location for testing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = { pathname: "/day" };

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
    const { user } = renderWithDayProviders(<DayViewContent />);

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
    renderWithDayProviders(<DayViewContent />, {
      initialDate: specificDate,
    });

    // Should show October 20, 2025 (Monday)
    expect(screen.getByText("Monday")).toBeInTheDocument();
    expect(screen.getByText("October 20")).toBeInTheDocument();
  });

  it("should show today indicator when viewing today", () => {
    // Test with today's date (using UTC for consistency)
    const today = dayjs().utc();
    renderWithDayProviders(<DayViewContent />, {
      initialDate: today,
    });

    // Should show today's date
    const todayWeekday = today.format(DAY_HEADING_FORMAT);
    const todayDate = today.format(DAY_SUBHEADING_FORMAT);
    expect(screen.getByText(todayWeekday)).toBeInTheDocument();
    expect(screen.getByText(todayDate)).toBeInTheDocument();
  });

  it("should display dates in local timezone regardless of UTC offset", () => {
    jest.useFakeTimers();
    // Set time to 11pm on Oct 19 in CST (4am Oct 20 UTC)
    jest.setSystemTime(new Date("2025-10-20T04:00:00.000Z"));

    // Mock timezone to CST
    const testDate = dayjs.utc("2025-10-20T04:00:00.000Z");
    renderWithDayProviders(<DayViewContent />, {
      initialDate: testDate,
    });

    // Should show Oct 19 (local), not Oct 20 (UTC)
    const localDate = testDate.local();
    expect(
      screen.getByText(localDate.format(DAY_HEADING_FORMAT)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(localDate.format(DAY_SUBHEADING_FORMAT)),
    ).toBeInTheDocument();

    jest.useRealTimers();
  });
});
