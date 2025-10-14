import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { TodayView } from "../../TodayView";

// Mock PostHog
jest.mock("posthog-js/react", () => ({
  useFeatureFlagEnabled: jest.fn(() => false),
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

describe("TodayView", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render without crashing", () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TodayView />
      </Provider>,
    );

    expect(screen.getByTestId("tasks-scroll")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-scroll")).toBeInTheDocument();
  });

  it("should show experimental feature warning when flag is disabled", () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TodayView />
      </Provider>,
    );

    expect(screen.getByText(/Experimental Feature/i)).toBeInTheDocument();
    expect(
      screen.getByText(/This feature is currently in beta/i),
    ).toBeInTheDocument();
  });

  it("should not show warning when feature flag is enabled", () => {
    const { useFeatureFlagEnabled } = require("posthog-js/react");
    useFeatureFlagEnabled.mockReturnValue(true);

    const store = createMockStore();

    render(
      <Provider store={store}>
        <TodayView />
      </Provider>,
    );

    expect(screen.queryByText(/Experimental Feature/i)).not.toBeInTheDocument();
  });

  it("should render TaskList component", () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TodayView />
      </Provider>,
    );

    expect(screen.getByText("Add task")).toBeInTheDocument();
  });

  it("should render CalendarAgenda component", () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TodayView />
      </Provider>,
    );

    expect(screen.getByTestId("calendar-scroll")).toBeInTheDocument();
  });

  it("should have split layout with correct widths", () => {
    const store = createMockStore();

    const { container } = render(
      <Provider store={store}>
        <TodayView />
      </Provider>,
    );

    const tasksPanel = screen.getByTestId("tasks-scroll").closest(".w-96");
    expect(tasksPanel).toBeInTheDocument();
  });

  it("should wrap content in TaskProvider", () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TodayView />
      </Provider>,
    );

    // TaskProvider provides context, so TaskList should work
    expect(screen.getByText("Add task")).toBeInTheDocument();
  });
});
