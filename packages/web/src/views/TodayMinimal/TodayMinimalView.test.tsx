import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { TodayMinimalView } from "./TodayMinimalView";

describe("TodayMinimalView", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render without crashing", () => {
    render(<TodayMinimalView />);

    expect(screen.getByTestId("tasks-scroll")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-scroll")).toBeInTheDocument();
  });

  it("should wrap content in TodayMinimalProvider", () => {
    render(<TodayMinimalView />);

    // Should have access to context (tasks should be visible)
    expect(screen.getByText("Add task")).toBeInTheDocument();
    expect(screen.getAllByText("Development")).toHaveLength(2);
  });

  it("should render TodayMinimalContent", () => {
    render(<TodayMinimalView />);

    // Should render the main content
    expect(screen.getByTestId("tasks-scroll")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-scroll")).toBeInTheDocument();
  });

  it("should have proper container styling", () => {
    const { container } = render(<TodayMinimalView />);

    // Should have h-screen and overflow-hidden classes
    const mainDiv = container.querySelector("div");
    expect(mainDiv).toHaveClass("h-screen", "overflow-hidden");
  });

  it("should render task list with mock data", () => {
    render(<TodayMinimalView />);

    // Should show mock tasks
    expect(screen.getByText(/Add timeout to initial sync/)).toBeInTheDocument();
    expect(screen.getByText("Call mom to check in")).toBeInTheDocument();
    expect(screen.getByText("Go for a 30-minute walk")).toBeInTheDocument();
  });

  it("should render calendar with mock events", () => {
    render(<TodayMinimalView />);

    // Should show mock time blocks
    expect(screen.getByText("Morning standup")).toBeInTheDocument();
    expect(screen.getByText("Deep work session")).toBeInTheDocument();
    expect(screen.getByText("Lunch break")).toBeInTheDocument();
  });

  it("should handle localStorage persistence", () => {
    render(<TodayMinimalView />);

    // Should persist data to localStorage
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const tasksKey = `compass.todayMinimal.tasks.${dateKey}`;
    const timeBlocksKey = `compass.todayMinimal.timeBlocks.${dateKey}`;

    // Check that data is persisted
    expect(localStorage.getItem(tasksKey)).toBeTruthy();
    expect(localStorage.getItem(timeBlocksKey)).toBeTruthy();
  });

  it("should load data from localStorage on mount", () => {
    // Pre-populate localStorage
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const tasksKey = `compass.todayMinimal.tasks.${dateKey}`;
    const timeBlocksKey = `compass.todayMinimal.timeBlocks.${dateKey}`;

    const mockTasks = [
      {
        id: "loaded-task-1",
        title: "Loaded task",
        priority: "Work",
        status: "todo",
        estimatedTime: 30,
        actualTime: 0,
        category: "Personal",
      },
    ];

    const mockTimeBlocks = [
      {
        id: "loaded-block-1",
        title: "Loaded event",
        startTime: "14:00",
        endTime: "15:00",
        category: "Meeting",
        priority: "Work",
        type: "event",
        status: "todo",
      },
    ];

    localStorage.setItem(tasksKey, JSON.stringify(mockTasks));
    localStorage.setItem(timeBlocksKey, JSON.stringify(mockTimeBlocks));

    render(<TodayMinimalView />);

    // Should load the data
    expect(screen.getByText("Loaded task")).toBeInTheDocument();
    expect(screen.getByText("Loaded event")).toBeInTheDocument();
  });

  it("should handle localStorage errors gracefully", () => {
    // Mock localStorage to throw error
    const originalGetItem = localStorage.getItem;
    localStorage.getItem = jest.fn(() => {
      throw new Error("localStorage error");
    });

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(<TodayMinimalView />);

    // Should still render with default data
    expect(screen.getByText("Add task")).toBeInTheDocument();
    expect(screen.getByText("Morning standup")).toBeInTheDocument();

    // Restore mocks
    localStorage.getItem = originalGetItem;
    consoleSpy.mockRestore();
  });

  it("should update current time", () => {
    render(<TodayMinimalView />);

    // Should show current time marker
    expect(screen.getByTestId("calendar-scroll")).toContainElement(
      screen
        .getByTestId("calendar-scroll")
        ?.querySelector('[data-now-marker="true"]'),
    );
  });

  it("should handle window resize", () => {
    render(<TodayMinimalView />);

    // Simulate window resize
    fireEvent.resize(window);

    // Should not crash
    expect(screen.getByTestId("tasks-scroll")).toBeInTheDocument();
  });

  it("should handle focus events", () => {
    render(<TodayMinimalView />);

    // Simulate focus events
    fireEvent.focus(window);
    fireEvent.blur(window);

    // Should not crash
    expect(screen.getByTestId("tasks-scroll")).toBeInTheDocument();
  });
});
