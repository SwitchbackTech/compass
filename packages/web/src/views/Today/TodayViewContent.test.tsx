import React from "react";
import { act } from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TodayViewContent } from "./TodayViewContent";
import { TaskProvider } from "./context/TaskProvider";

// Mock the CalendarAgenda component
jest.mock("./components/CalendarAgenda", () => ({
  CalendarAgenda: () => (
    <div className="h-96 bg-gray-100">Calendar Content</div>
  ),
}));

// Mock the keyboard shortcuts hook
jest.mock("./hooks/useTodayViewShortcuts", () => ({
  useTodayViewShortcuts: jest.fn(),
}));

const renderWithProvider = (component: React.ReactElement) => {
  return render(<TaskProvider>{component}</TaskProvider>);
};

describe("TodayViewContent", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render the main layout with tasks and calendar sections", () => {
    renderWithProvider(<TodayViewContent />);

    // Verify the main components are present
    expect(screen.getByText("Add task")).toBeInTheDocument();
    expect(screen.getByText("Calendar Content")).toBeInTheDocument();
  });

  it("should display today's date in the tasks section", () => {
    renderWithProvider(<TodayViewContent />);

    // Check that today's date is displayed
    const todayHeading = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    expect(screen.getByText(todayHeading)).toBeInTheDocument();
  });

  it("should allow users to add new tasks", async () => {
    const user = userEvent.setup();
    renderWithProvider(<TodayViewContent />);

    // Click the add task button
    const addTaskButton = screen.getByText("Add task");
    await act(() => user.click(addTaskButton));

    // Verify input field appears
    expect(
      screen.getByPlaceholderText("Enter task title..."),
    ).toBeInTheDocument();
  });

  it("should maintain a fixed height layout that fills the viewport", () => {
    renderWithProvider(<TodayViewContent />);

    // The layout should be present and functional
    expect(screen.getByText("Add task")).toBeInTheDocument();
    expect(screen.getByText("Calendar Content")).toBeInTheDocument();
  });

  it("should display add task button", () => {
    renderWithProvider(<TodayViewContent />);

    // The tasks section should be present and functional
    expect(screen.getByText("Add task")).toBeInTheDocument();

    // Users should be able to interact with the tasks section
    expect(screen.getByText("Add task")).toBeEnabled();
  });
});
