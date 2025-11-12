import * as PostHogReact from "posthog-js/react";
import { Provider as ReduxProvider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import { useDayEvents } from "../hooks/events/useDayEvents";
import { DayView } from "./DayView";

// Mock PostHog
jest.mock("posthog-js/react", () => ({
  useFeatureFlagEnabled: jest.fn(() => false),
}));

// Mock useDayEvents hook
jest.mock("../hooks/events/useDayEvents", () => ({
  useDayEvents: jest.fn(() => ({
    events: [],
    isLoading: false,
    error: null,
  })),
}));

const createMockStore = () => {
  return configureStore({
    reducer: {
      events: () => ({
        entities: {
          value: {},
        },
      }),
    },
  });
};

const renderWithRouter = () => {
  return render(
    <ReduxProvider store={createMockStore()}>
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
        initialEntries={["/day"]}
      >
        <DayView />
      </MemoryRouter>
    </ReduxProvider>,
  );
};

describe("DayView", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should show experimental feature warning when flag is disabled", () => {
    renderWithRouter();

    expect(screen.getByText(/Experimental Feature/i)).toBeInTheDocument();
    expect(
      screen.getByText(/This feature is currently in beta/i),
    ).toBeInTheDocument();
  });

  it("should not show warning when feature flag is enabled", () => {
    const mockUseFeatureFlagEnabled = jest.mocked(
      PostHogReact.useFeatureFlagEnabled,
    );
    mockUseFeatureFlagEnabled.mockReturnValue(true);

    renderWithRouter();

    expect(screen.queryByText(/Experimental Feature/i)).not.toBeInTheDocument();
  });

  it("should render TaskList component", () => {
    const mockUseFeatureFlagEnabled = jest.mocked(
      PostHogReact.useFeatureFlagEnabled,
    );
    mockUseFeatureFlagEnabled.mockReturnValue(true);
    renderWithRouter();

    const taskpanel = screen.getByRole("region", { name: "daily-tasks" });
    expect(within(taskpanel).getByText("Create task")).toBeInTheDocument();
  });

  it("should render CalendarAgenda component", () => {
    const mockUseFeatureFlagEnabled = jest.mocked(
      PostHogReact.useFeatureFlagEnabled,
    );
    mockUseFeatureFlagEnabled.mockReturnValue(true);

    const mockUseDayEvents = jest.mocked(useDayEvents);
    mockUseDayEvents.mockReturnValue({
      events: [],
      isLoading: false,
      error: null,
    });

    renderWithRouter();

    expect(screen.getByTestId("calendar-scroll")).toBeInTheDocument();
  });
});
