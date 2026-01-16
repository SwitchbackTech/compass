import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { Task } from "@web/common/types/task.types";
import { FocusedTask } from "./FocusedTask";

describe("FocusedTask", () => {
  const mockTask: Task = {
    id: "task-1",
    title: "Test Task",
    status: "todo",
    createdAt: "2025-11-15T10:00:00Z",
    order: 0,
  };

  const mockCompletedTask: Task = {
    id: "task-2",
    title: "Completed Task",
    status: "completed",
    createdAt: "2025-11-15T11:00:00Z",
    order: 0,
  };

  const mockOnCompleteTask = jest.fn();
  const mockOnPreviousTask = jest.fn();
  const mockOnNextTask = jest.fn();
  const mockOnUpdateDescription = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the task title", () => {
    render(
      <FocusedTask
        task={mockTask}
        onCompleteTask={mockOnCompleteTask}
        onPreviousTask={mockOnPreviousTask}
        onNextTask={mockOnNextTask}
        onUpdateDescription={mockOnUpdateDescription}
      />,
    );

    expect(screen.getByText("Test Task")).toBeInTheDocument();
  });

  it("renders the task title in a heading", () => {
    render(
      <FocusedTask
        task={mockTask}
        onCompleteTask={mockOnCompleteTask}
        onPreviousTask={mockOnPreviousTask}
        onNextTask={mockOnNextTask}
        onUpdateDescription={mockOnUpdateDescription}
      />,
    );

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Test Task");
  });

  it("renders task with completed status", () => {
    render(
      <FocusedTask
        task={mockCompletedTask}
        onCompleteTask={mockOnCompleteTask}
        onPreviousTask={mockOnPreviousTask}
        onNextTask={mockOnNextTask}
        onUpdateDescription={mockOnUpdateDescription}
      />,
    );

    expect(screen.getByText("Completed Task")).toBeInTheDocument();
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Completed Task");
  });

  it("renders task with long title", () => {
    const longTitleTask: Task = {
      id: "task-3",
      title: "This is a very long task title that might wrap to multiple lines",
      status: "todo",
      createdAt: "2025-11-15T12:00:00Z",
      order: 0,
    };

    render(
      <FocusedTask
        task={longTitleTask}
        onCompleteTask={mockOnCompleteTask}
        onPreviousTask={mockOnPreviousTask}
        onNextTask={mockOnNextTask}
        onUpdateDescription={mockOnUpdateDescription}
      />,
    );

    expect(
      screen.getByText(
        "This is a very long task title that might wrap to multiple lines",
      ),
    ).toBeInTheDocument();
  });

  it("renders task with special characters in title", () => {
    const specialCharTask: Task = {
      id: "task-4",
      title: "Task with @#$%^&*() special chars!",
      status: "todo",
      createdAt: "2025-11-15T13:00:00Z",
      order: 0,
    };

    render(
      <FocusedTask
        task={specialCharTask}
        onCompleteTask={mockOnCompleteTask}
        onPreviousTask={mockOnPreviousTask}
        onNextTask={mockOnNextTask}
        onUpdateDescription={mockOnUpdateDescription}
      />,
    );

    expect(
      screen.getByText("Task with @#$%^&*() special chars!"),
    ).toBeInTheDocument();
  });

  it("renders task with empty title", () => {
    const emptyTitleTask: Task = {
      id: "task-5",
      title: "",
      status: "todo",
      createdAt: "2025-11-15T14:00:00Z",
      order: 0,
    };

    render(
      <FocusedTask
        task={emptyTitleTask}
        onCompleteTask={mockOnCompleteTask}
        onPreviousTask={mockOnPreviousTask}
        onNextTask={mockOnNextTask}
        onUpdateDescription={mockOnUpdateDescription}
      />,
    );

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("");
  });

  it("calls onCompleteTask when CheckCircle is clicked", async () => {
    const user = userEvent.setup();
    render(
      <FocusedTask
        task={mockTask}
        onCompleteTask={mockOnCompleteTask}
        onPreviousTask={mockOnPreviousTask}
        onNextTask={mockOnNextTask}
        onUpdateDescription={mockOnUpdateDescription}
      />,
    );

    const checkButton = screen.getByRole("button", {
      name: "Mark task as complete",
    });
    await user.click(checkButton);

    expect(mockOnCompleteTask).toHaveBeenCalledTimes(1);
  });

  describe("Tooltip Hints", () => {
    it("does not show tooltip initially", () => {
      render(
        <FocusedTask
          task={mockTask}
          onCompleteTask={mockOnCompleteTask}
          onPreviousTask={mockOnPreviousTask}
          onNextTask={mockOnNextTask}
          onUpdateDescription={mockOnUpdateDescription}
        />,
      );

      // Tooltips should not be visible initially
      expect(screen.queryByText("Mark Done")).not.toBeInTheDocument();
      expect(screen.queryByText("Previous Task")).not.toBeInTheDocument();
      expect(screen.queryByText("Next Task")).not.toBeInTheDocument();
      expect(screen.queryByText("Enter")).not.toBeInTheDocument();
      expect(screen.queryByText("j")).not.toBeInTheDocument();
      expect(screen.queryByText("k")).not.toBeInTheDocument();
    });

    it("shows tooltip on hover for complete button", async () => {
      const user = userEvent.setup();
      render(
        <FocusedTask
          task={mockTask}
          onCompleteTask={mockOnCompleteTask}
          onPreviousTask={mockOnPreviousTask}
          onNextTask={mockOnNextTask}
          onUpdateDescription={mockOnUpdateDescription}
        />,
      );

      const completeButton = screen.getByRole("button", {
        name: "Mark task as complete",
      });

      // Tooltip should not be visible initially
      expect(screen.queryByText("Mark Done")).not.toBeInTheDocument();
      expect(screen.queryByText("Enter")).not.toBeInTheDocument();

      // Hover over button to show tooltip
      await user.hover(completeButton);

      // Wait for tooltip to appear with both description and shortcut
      await waitFor(
        () => {
          expect(screen.getByText("Mark Done")).toBeInTheDocument();
          expect(screen.getByText("Enter")).toBeInTheDocument();
        },
        { timeout: 500 },
      );
    });

    it("shows tooltip on hover for previous button", async () => {
      const user = userEvent.setup();
      render(
        <FocusedTask
          task={mockTask}
          onCompleteTask={mockOnCompleteTask}
          onPreviousTask={mockOnPreviousTask}
          onNextTask={mockOnNextTask}
          onUpdateDescription={mockOnUpdateDescription}
        />,
      );

      const previousButton = screen.getByRole("button", {
        name: "Previous task",
      });

      // Tooltip should not be visible initially
      expect(screen.queryByText("Previous Task")).not.toBeInTheDocument();
      expect(screen.queryByText("j")).not.toBeInTheDocument();

      // Hover over button to show tooltip
      await user.hover(previousButton);

      // Wait for tooltip to appear with both description and shortcut
      await waitFor(
        () => {
          expect(screen.getByText("Previous Task")).toBeInTheDocument();
          expect(screen.getByText("j")).toBeInTheDocument();
        },
        { timeout: 500 },
      );
    });

    it("shows tooltip on hover for next button", async () => {
      const user = userEvent.setup();
      render(
        <FocusedTask
          task={mockTask}
          onCompleteTask={mockOnCompleteTask}
          onPreviousTask={mockOnPreviousTask}
          onNextTask={mockOnNextTask}
          onUpdateDescription={mockOnUpdateDescription}
        />,
      );

      const nextButton = screen.getByRole("button", {
        name: "Next task",
      });

      // Tooltip should not be visible initially
      expect(screen.queryByText("Next Task")).not.toBeInTheDocument();
      expect(screen.queryByText("k")).not.toBeInTheDocument();

      // Hover over button to show tooltip
      await user.hover(nextButton);

      // Wait for tooltip to appear with both description and shortcut
      await waitFor(
        () => {
          expect(screen.getByText("Next Task")).toBeInTheDocument();
          expect(screen.getByText("k")).toBeInTheDocument();
        },
        { timeout: 500 },
      );
    });

    it("hides tooltip when mouse leaves complete button", async () => {
      const user = userEvent.setup();
      render(
        <FocusedTask
          task={mockTask}
          onCompleteTask={mockOnCompleteTask}
          onPreviousTask={mockOnPreviousTask}
          onNextTask={mockOnNextTask}
          onUpdateDescription={mockOnUpdateDescription}
        />,
      );

      const completeButton = screen.getByRole("button", {
        name: "Mark task as complete",
      });

      // Hover to show tooltip
      await user.hover(completeButton);
      await waitFor(
        () => {
          expect(screen.getByText("Mark Done")).toBeInTheDocument();
          expect(screen.getByText("Enter")).toBeInTheDocument();
        },
        { timeout: 500 },
      );

      // Move mouse away to hide tooltip
      await user.unhover(completeButton);
      await waitFor(
        () => {
          expect(screen.queryByText("Mark Done")).not.toBeInTheDocument();
          expect(screen.queryByText("Enter")).not.toBeInTheDocument();
        },
        { timeout: 500 },
      );
    });
  });
});
