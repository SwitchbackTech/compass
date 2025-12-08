import { act } from "react";
import { createMemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "@core/util/date/dayjs";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import {
  loadDayData,
  loadSpecificDayData,
  loadTodayData,
} from "@web/routers/loaders";
import {
  DAY_HEADING_FORMAT,
  DAY_SUBHEADING_FORMAT,
} from "@web/views/Day/components/TaskList/TaskListHeader";

// Mock the Agenda component
jest.mock("../components/Agenda/Agenda", () => ({
  Agenda: () => <div className="h-96">Calendar Content</div>,
}));

// Mock the ShortcutsOverlay component
jest.mock("@web/components/Shortcuts/ShortcutOverlay/ShortcutsOverlay", () => ({
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

const createRouter = () =>
  createMemoryRouter(
    [
      {
        path: ROOT_ROUTES.DAY,
        lazy: async () =>
          import(
            /* webpackChunkName: "day" */ "@web/views/Day/view/DayView"
          ).then((module) => ({ Component: module.DayView })),
        children: [
          {
            path: ROOT_ROUTES.DAY_DATE,
            id: ROOT_ROUTES.DAY_DATE,
            loader: loadSpecificDayData,
            lazy: async () =>
              import(
                /* webpackChunkName: "date" */ "@web/views/Day/view/DayViewContent"
              ).then((module) => ({ Component: module.DayViewContent })),
          },
          {
            index: true,
            loader: loadDayData,
          },
        ],
      },
    ],
    {
      future: { v7_relativeSplatPath: true },
      initialEntries: [`${ROOT_ROUTES.DAY}/${loadTodayData().dateString}`],
    },
  );

// Test with a specific date to avoid timezone issues
const dateString = "2025-10-19";

const testDate = dayjs(dateString, dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT); // Sunday

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

  it("should show today's date when navigating to /day", async () => {
    const router = createRouter();

    await act(() => render(<></>, { router }));

    // Should show today's date in the header
    const todayHeading = new Date().toLocaleDateString("en-US", {
      weekday: "long",
    });

    expect(screen.getByText(todayHeading)).toBeInTheDocument();
  });

  it("should show next day label when clicking next day button", async () => {
    const user = userEvent.setup();
    const router = createRouter();

    await act(() => render(<></>, { router }));

    await act(() => router.navigate(`${ROOT_ROUTES.DAY}/${dateString}`));

    // Find and click the next day button
    const nextDayButton = screen.getByRole("button", { name: "Next day" });

    await act(() => user.click(nextDayButton));

    // Should show tomorrow's date (Monday, October 20)
    const tomorrow = testDate.add(1, "day");
    const tomorrowWeekday = tomorrow.format(DAY_HEADING_FORMAT);
    const tomorrowDate = tomorrow.format(DAY_SUBHEADING_FORMAT);

    expect(screen.getByText(tomorrowWeekday)).toBeInTheDocument();
    expect(screen.getByText(tomorrowDate)).toBeInTheDocument();
  });

  it("should show previous day when clicking previous day button", async () => {
    const user = userEvent.setup();
    const router = createRouter();

    await act(() => render(<></>, { router }));

    await act(() => router.navigate(`${ROOT_ROUTES.DAY}/${dateString}`));

    // Find and click the previous day button
    const prevDayButton = screen.getByRole("button", { name: "Previous day" });

    await act(() => user.click(prevDayButton));

    // Should show yesterday's date (Saturday, October 18)
    const yesterday = testDate.subtract(1, "day");
    const yesterdayWeekday = yesterday.format(DAY_HEADING_FORMAT);
    const yesterdayDate = yesterday.format(DAY_SUBHEADING_FORMAT);

    expect(screen.getByText(yesterdayWeekday)).toBeInTheDocument();
    expect(screen.getByText(yesterdayDate)).toBeInTheDocument();
  });

  it("should show today when clicking go to today button", async () => {
    const user = userEvent.setup();
    const router = createRouter();

    await act(() => render(<></>, { router }));

    await act(() => router.navigate(`${ROOT_ROUTES.DAY}/${dateString}`));

    // Go to different day to make the "Go to today" button visible
    const prevDayButton = screen.getByRole("button", { name: "Previous day" });

    await act(() => user.click(prevDayButton));

    // Wait for the navigation to complete and verify we're on yesterday
    const yesterday = testDate.subtract(1, "day");
    const yesterdayWeekday = yesterday.format(DAY_HEADING_FORMAT);

    await screen.findByText(yesterdayWeekday);

    // Find and click the go to today button (it should be visible when not viewing today)
    const goToTodayButton = screen.getByRole("button", { name: "Go to today" });

    await act(() => user.click(goToTodayButton));

    // Should show today's date (the actual current date, not the test date)
    const today = dayjs().utc();
    const todayWeekday = today.format(DAY_HEADING_FORMAT);
    const todayDate = today.format(DAY_SUBHEADING_FORMAT);

    expect(screen.getByText(todayWeekday)).toBeInTheDocument();
    expect(screen.getByText(todayDate)).toBeInTheDocument();
  });

  it("should render specific dates correctly", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-10-20T12:00:00.000Z"));

    const router = createRouter();

    await act(() => render(<></>, { router }));

    expect(screen.getByText("Monday")).toBeInTheDocument();
    expect(screen.getByText("October 20")).toBeInTheDocument();

    jest.useRealTimers();
  });
});
describe("Navigation with URL updates", () => {
  it("should update URL when navigating to next day", async () => {
    const user = userEvent.setup();
    const router = createRouter();

    await act(() => render(<></>, { router }));

    // Find and click the next day button
    const nextDayButton = screen.getByRole("button", { name: "Next day" });

    const nextDay = dayjs()
      .add(1, "day")
      .format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);

    await act(async () => {
      await user.click(nextDayButton);
    });

    expect(router.state.location.pathname).toEqual(
      `${ROOT_ROUTES.DAY}/${nextDay}`,
    );

    expect(nextDayButton).toBeInTheDocument();
  });

  it("should update URL when navigating to previous day", async () => {
    const user = userEvent.setup();
    const router = createRouter();

    await act(() => render(<></>, { router }));

    // Find and click the previous day button
    const prevDayButton = screen.getByRole("button", { name: "Previous day" });

    await act(() => user.click(prevDayButton));

    const prevDay = dayjs()
      .subtract(1, "day")
      .format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);

    // Verify the button click works
    expect(prevDayButton).toBeInTheDocument();

    expect(router.state.location.pathname).toEqual(
      `${ROOT_ROUTES.DAY}/${prevDay}`,
    );
  });

  it("should display correct date in header when viewing specific date", async () => {
    const router = createRouter();
    const specificDate = dayjs("2025-10-20");
    const testDateString = specificDate.format(
      dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
    );

    await act(() => render(<></>, { router }));
    await act(() => router.navigate(`${ROOT_ROUTES.DAY}/${testDateString}`));

    expect(router.state.location.pathname).toEqual(
      `${ROOT_ROUTES.DAY}/${testDateString}`,
    );

    // Should show October 20, 2025 (Monday)
    expect(screen.getByText("Monday")).toBeInTheDocument();
    expect(screen.getByText("October 20")).toBeInTheDocument();
  });

  it("should show today indicator when viewing today", async () => {
    // Test with today's date (using UTC for consistency)
    const today = dayjs().utc();

    const router = createRouter();

    await act(() => render(<></>, { router }));

    // Should show today's date
    const todayWeekday = today.format(DAY_HEADING_FORMAT);
    const todayDate = today.format(DAY_SUBHEADING_FORMAT);

    await expect(screen.findByText(todayWeekday)).resolves.toBeInTheDocument();
    await expect(screen.findByText(todayDate)).resolves.toBeInTheDocument();
  });
});
