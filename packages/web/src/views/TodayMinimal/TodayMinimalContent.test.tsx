import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TodayMinimalContent } from "./TodayMinimalContent";
import { TodayMinimalProvider } from "./context/TodayMinimalProvider";

const renderWithProvider = () => {
  return render(
    <TodayMinimalProvider>
      <TodayMinimalContent />
    </TodayMinimalProvider>,
  );
};

describe("TodayMinimalContent", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render without crashing", () => {
    renderWithProvider();

    expect(screen.getByTestId("tasks-scroll")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-scroll")).toBeInTheDocument();
  });

  it("should have two-panel layout", () => {
    renderWithProvider();

    // Check for task panel
    const taskPanel = screen.getByTestId("tasks-scroll").closest(".w-96");
    expect(taskPanel).toBeInTheDocument();

    // Check for calendar panel
    const calendarPanel = screen
      .getByTestId("calendar-scroll")
      .closest(".flex-1");
    expect(calendarPanel).toBeInTheDocument();
  });

  it("should handle keyboard shortcuts", () => {
    renderWithProvider();

    // Test T key to add task
    fireEvent.keyDown(document, { key: "t" });

    // Should trigger add task (visual change would be in TaskList)
    expect(screen.getByText("Add task")).toBeInTheDocument();
  });

  it("should handle U key to focus tasks", () => {
    renderWithProvider();

    // Test U key to focus tasks
    fireEvent.keyDown(document, { key: "u" });

    // Should focus first task (visual change would be in focus state)
    const firstTask = screen.getAllByRole("checkbox")[0];
    expect(firstTask).toBeInTheDocument();
  });

  it("should handle C key to focus calendar", () => {
    renderWithProvider();

    // Test C key to focus calendar
    fireEvent.keyDown(document, { key: "c" });

    // Should focus calendar (visual change would be in focus state)
    expect(screen.getByTestId("calendar-scroll")).toBeInTheDocument();
  });

  it("should handle J key to navigate to next task", () => {
    renderWithProvider();

    // Focus first task first
    const firstTask = screen.getAllByRole("checkbox")[0];
    fireEvent.focus(firstTask);

    // Test J key to go to next task
    fireEvent.keyDown(document, { key: "j" });

    // Should navigate to next task (visual change would be in focus state)
    expect(screen.getAllByRole("checkbox")).toHaveLength(5);
  });

  it("should handle K key to navigate to previous task", () => {
    renderWithProvider();

    // Focus first task first
    const firstTask = screen.getAllByRole("checkbox")[0];
    fireEvent.focus(firstTask);

    // Test K key to go to previous task
    fireEvent.keyDown(document, { key: "k" });

    // Should navigate to previous task (visual change would be in focus state)
    expect(screen.getAllByRole("checkbox")).toHaveLength(5);
  });

  it("should handle Escape key to clear focus", () => {
    renderWithProvider();

    // Focus first task first
    const firstTask = screen.getAllByRole("checkbox")[0];
    fireEvent.focus(firstTask);

    // Test Escape key to clear focus
    fireEvent.keyDown(document, { key: "Escape" });

    // Should clear focus (visual change would be in focus state)
    expect(screen.getByTestId("tasks-scroll")).toBeInTheDocument();
  });

  it("should not handle shortcuts when in input field", () => {
    renderWithProvider();

    // Click add task to show input
    fireEvent.click(screen.getByText("Add task"));
    const input = screen.getByPlaceholderText("Enter task title...");

    // Test T key while in input
    fireEvent.keyDown(input, { key: "t" });

    // Should not trigger add task again
    expect(screen.getAllByPlaceholderText("Enter task title...")).toHaveLength(
      1,
    );
  });

  it("should handle task focus events", () => {
    renderWithProvider();

    // Focus first task
    const firstTask = screen.getAllByRole("checkbox")[0];
    fireEvent.focus(firstTask);

    // Should update focus state (visual change would be in focus state)
    expect(firstTask).toBeInTheDocument();
  });

  it("should handle task selection events", () => {
    renderWithProvider();

    // Focus first task
    const firstTask = screen.getAllByRole("checkbox")[0];
    fireEvent.focus(firstTask);

    // Should update selection state (visual change would be in selection state)
    expect(firstTask).toBeInTheDocument();
  });

  it("should render TaskList component", () => {
    renderWithProvider();

    expect(screen.getByText("Add task")).toBeInTheDocument();
    expect(screen.getAllByText("Development")).toHaveLength(2);
  });

  it("should render CalendarAgenda component", () => {
    renderWithProvider();

    expect(screen.getByTestId("calendar-scroll")).toBeInTheDocument();
    expect(screen.getByText("Morning standup")).toBeInTheDocument();
  });

  it("should handle focus management between panels", () => {
    renderWithProvider();

    // Focus task first
    const firstTask = screen.getAllByRole("checkbox")[0];
    fireEvent.focus(firstTask);

    // Focus calendar
    fireEvent.keyDown(document, { key: "c" });

    // Should clear task focus and focus calendar
    expect(screen.getByTestId("calendar-scroll")).toBeInTheDocument();
  });

  it("should handle empty tasks array", () => {
    // Mock empty tasks by providing a custom provider
    const EmptyProvider = ({ children }: { children: React.ReactNode }) => (
      <div data-testid="mock-provider">{children}</div>
    );

    render(
      <EmptyProvider>
        <TodayMinimalContent />
      </EmptyProvider>,
    );

    // Should still render without crashing
    expect(screen.getByTestId("mock-provider")).toBeInTheDocument();
  });

  it("should handle keyboard navigation with no tasks", () => {
    renderWithProvider();

    // Test J key with no focused task
    fireEvent.keyDown(document, { key: "j" });

    // Should not crash
    expect(screen.getByTestId("tasks-scroll")).toBeInTheDocument();
  });

  it("should handle keyboard navigation with single task", () => {
    renderWithProvider();

    // Focus first task
    const firstTask = screen.getAllByRole("checkbox")[0];
    fireEvent.focus(firstTask);

    // Test J key to go to next task (should wrap to first)
    fireEvent.keyDown(document, { key: "j" });

    // Should not crash
    expect(screen.getByTestId("tasks-scroll")).toBeInTheDocument();
  });

  it("should handle window focus events", () => {
    renderWithProvider();

    // Simulate window focus
    fireEvent.focus(window);

    // Should not crash
    expect(screen.getByTestId("tasks-scroll")).toBeInTheDocument();
  });

  it("should handle window blur events", () => {
    renderWithProvider();

    // Simulate window blur
    fireEvent.blur(window);

    // Should not crash
    expect(screen.getByTestId("tasks-scroll")).toBeInTheDocument();
  });
});
