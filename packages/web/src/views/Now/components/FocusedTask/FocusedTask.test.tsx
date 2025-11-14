import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { Task } from "@web/views/Day/task.types";
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

  it("renders the task title", () => {
    render(<FocusedTask task={mockTask} />);

    expect(screen.getByText("Test Task")).toBeInTheDocument();
  });

  it("renders the task title in a heading", () => {
    render(<FocusedTask task={mockTask} />);

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Test Task");
  });

  it("renders task with completed status", () => {
    render(<FocusedTask task={mockCompletedTask} />);

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

    render(<FocusedTask task={longTitleTask} />);

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

    render(<FocusedTask task={specialCharTask} />);

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

    render(<FocusedTask task={emptyTitleTask} />);

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("");
  });
});
