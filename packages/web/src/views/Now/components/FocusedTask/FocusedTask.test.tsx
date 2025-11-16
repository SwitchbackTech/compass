import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Task } from "@web/common/types/task.types";
import { FocusedTask } from "./FocusedTask";

describe("FocusedTask", () => {
  const mockTask: Task = {
    id: "task-1",
    title: "Test Task",
    status: "todo",
    createdAt: "2025-11-15T10:00:00Z",
  };

  const mockCompletedTask: Task = {
    id: "task-2",
    title: "Completed Task",
    status: "completed",
    createdAt: "2025-11-15T11:00:00Z",
  };

  const mockOnCompleteTask = jest.fn();
  const mockOnPreviousTask = jest.fn();
  const mockOnNextTask = jest.fn();

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
    };

    render(
      <FocusedTask
        task={longTitleTask}
        onCompleteTask={mockOnCompleteTask}
        onPreviousTask={mockOnPreviousTask}
        onNextTask={mockOnNextTask}
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
    };

    render(
      <FocusedTask
        task={specialCharTask}
        onCompleteTask={mockOnCompleteTask}
        onPreviousTask={mockOnPreviousTask}
        onNextTask={mockOnNextTask}
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
    };

    render(
      <FocusedTask
        task={emptyTitleTask}
        onCompleteTask={mockOnCompleteTask}
        onPreviousTask={mockOnPreviousTask}
        onNextTask={mockOnNextTask}
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
      />,
    );

    const checkButton = screen.getByRole("button", {
      name: "Mark task as complete",
    });
    await user.click(checkButton);

    expect(mockOnCompleteTask).toHaveBeenCalledTimes(1);
  });
});
