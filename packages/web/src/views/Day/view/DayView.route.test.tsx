import { act, type ReactNode } from "react";
import { createMemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import "fake-indexeddb/auto";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "@core/util/date/dayjs";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import {
  DAY_HEADING_FORMAT,
  DAY_SUBHEADING_FORMAT,
} from "@web/views/Day/components/TaskList/TaskListHeader";
import {
  beforeEach,
  describe,
  expect,
  it,
  mock,
  setSystemTime,
} from "bun:test";
import { afterAll } from "bun:test";

const mockRecipeInit = mock(() => ({}));
const mockSuperTokensInit = mock();

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

mock.module("../components/Agenda/Agenda", () => ({
  Agenda: () => <div className="h-96">Calendar Content</div>,
}));

mock.module("@web/views/Day/components/Agenda/Agenda", () => ({
  Agenda: () => <div className="h-96">Calendar Content</div>,
}));

mock.module(
  "@web/components/Shortcuts/ShortcutOverlay/ShortcutsOverlay",
  () => ({
    ShortcutsOverlay: () => <div data-testid="shortcuts-overlay" />,
  }),
);

const { useDayViewShortcuts: actualUseDayViewShortcuts } =
  require("@web/views/Day/hooks/shortcuts/useDayViewShortcuts") as typeof import("@web/views/Day/hooks/shortcuts/useDayViewShortcuts");
const mockUseDayViewShortcuts = mock(
  (...args: Parameters<typeof actualUseDayViewShortcuts>) =>
    actualUseDayViewShortcuts(...args),
);

mock.module("../hooks/shortcuts/useDayViewShortcuts", () => ({
  useDayViewShortcuts: mockUseDayViewShortcuts,
}));

mock.module("@web/views/Day/hooks/shortcuts/useDayViewShortcuts", () => ({
  useDayViewShortcuts: mockUseDayViewShortcuts,
}));

mock.module("@web/views/Day/hooks/events/useDayEvents", () => ({
  useDayEvents: mock(),
}));

const { render } =
  require("@web/__tests__/__mocks__/mock.render") as typeof import("@web/__tests__/__mocks__/mock.render");
const { prepareEmptyStorageForTests } =
  require("@web/__tests__/utils/storage/indexeddb.test.util") as typeof import("@web/__tests__/utils/storage/indexeddb.test.util");
const { loadDayData, loadSpecificDayData, loadTodayData } =
  require("@web/routers/loaders") as typeof import("@web/routers/loaders");

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
  beforeEach(async () => {
    mockUseDayViewShortcuts.mockReset();
    mockUseDayViewShortcuts.mockImplementation((config) =>
      actualUseDayViewShortcuts(config),
    );
    mockRecipeInit.mockClear();
    mockSuperTokensInit.mockClear();
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: indexedDB,
    });
    await prepareEmptyStorageForTests();
  });

  it("should show today's date when navigating to /day", async () => {
    const router = createRouter();

    render(<div />, { router });

    // Should show today's date in the header
    const todayHeading = new Date().toLocaleDateString("en-US", {
      weekday: "long",
    });

    expect(await screen.findByText(todayHeading)).toBeInTheDocument();
  });

  it("should show next day label when clicking next day button", async () => {
    const user = userEvent.setup();
    const router = createRouter();

    render(<div />, { router });

    await act(async () => {
      await router.navigate(`${ROOT_ROUTES.DAY}/${dateString}`);
    });

    // Find and click the next day button
    const nextDayButton = await screen.findByRole("button", {
      name: "Next day",
    });

    await user.click(nextDayButton);

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

    render(<div />, { router });

    await act(async () => {
      await router.navigate(`${ROOT_ROUTES.DAY}/${dateString}`);
    });

    // Find and click the previous day button
    const prevDayButton = await screen.findByRole("button", {
      name: "Previous day",
    });

    await user.click(prevDayButton);

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

    render(<div />, { router });

    await act(async () => {
      await router.navigate(`${ROOT_ROUTES.DAY}/${dateString}`);
    });

    // Go to different day to make the "Go to today" button visible
    const prevDayButton = await screen.findByRole("button", {
      name: "Previous day",
    });

    await user.click(prevDayButton);

    // Wait for the navigation to complete and verify we're on yesterday
    const yesterday = testDate.subtract(1, "day");
    const yesterdayWeekday = yesterday.format(DAY_HEADING_FORMAT);

    await screen.findByText(yesterdayWeekday);

    // Find and click the go to today button (it should be visible when not viewing today)
    const goToTodayButton = screen.getByRole("button", { name: "Go to today" });

    await user.click(goToTodayButton);

    // Should show today's date (the actual current date, not the test date)
    const today = dayjs().utc();
    const todayWeekday = today.format(DAY_HEADING_FORMAT);
    const todayDate = today.format(DAY_SUBHEADING_FORMAT);

    expect(screen.getByText(todayWeekday)).toBeInTheDocument();
    expect(screen.getByText(todayDate)).toBeInTheDocument();
  });

  it("should render specific dates correctly", async () => {
    setSystemTime(new Date("2025-10-20T12:00:00.000Z"));

    const router = createRouter();

    render(<div />, { router });

    expect(await screen.findByText("Monday")).toBeInTheDocument();
    expect(await screen.findByText("October 20")).toBeInTheDocument();

    setSystemTime();
  });
});
describe("Navigation with URL updates", () => {
  it("should update URL when navigating to next day", async () => {
    const user = userEvent.setup();
    const router = createRouter();

    render(<div />, { router });

    // Wait for the component to render by finding a button
    const nextDayButton = await screen.findByRole("button", {
      name: "Next day",
    });

    const nextDay = dayjs()
      .add(1, "day")
      .format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);

    await user.click(nextDayButton);

    await waitFor(() => {
      expect(router.state.location.pathname).toEqual(
        `${ROOT_ROUTES.DAY}/${nextDay}`,
      );
    });

    expect(nextDayButton).toBeInTheDocument();
  });

  it("should update URL when navigating to previous day", async () => {
    const user = userEvent.setup();
    const router = createRouter();

    render(<div />, { router });

    // Wait for the component to render by finding a button
    const prevDayButton = await screen.findByRole("button", {
      name: "Previous day",
    });

    await user.click(prevDayButton);

    const prevDay = dayjs()
      .subtract(1, "day")
      .format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);

    // Verify the button click works
    expect(prevDayButton).toBeInTheDocument();

    await waitFor(() => {
      expect(router.state.location.pathname).toEqual(
        `${ROOT_ROUTES.DAY}/${prevDay}`,
      );
    });
  });

  it("should display correct date in header when viewing specific date", async () => {
    const router = createRouter();
    const specificDate = dayjs("2025-10-20");
    const testDateString = specificDate.format(
      dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
    );

    render(<div />, { router });
    await act(async () => {
      await router.navigate(`${ROOT_ROUTES.DAY}/${testDateString}`);
    });

    expect(router.state.location.pathname).toEqual(
      `${ROOT_ROUTES.DAY}/${testDateString}`,
    );

    // Wait for the component to render before checking for text
    expect(await screen.findByText("Monday")).toBeInTheDocument();
    expect(await screen.findByText("October 20")).toBeInTheDocument();
  });

  it("should show today indicator when viewing today", async () => {
    // Test with today's date (using UTC for consistency)
    const today = dayjs().utc();

    const router = createRouter();

    render(<div />, { router });

    // Should show today's date
    const todayWeekday = today.format(DAY_HEADING_FORMAT);
    const todayDate = today.format(DAY_SUBHEADING_FORMAT);

    await expect(screen.findByText(todayWeekday)).resolves.toBeInTheDocument();
    await expect(screen.findByText(todayDate)).resolves.toBeInTheDocument();
  });
});

afterAll(() => {
  mock.restore();
});
