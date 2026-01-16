import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Task } from "@web/common/types/task.types";
import { AvailableTasks } from "./AvailableTasks";

describe("AvailableTasks", () => {
  const mockOnTaskSelect = jest.fn();

  const mockTask1: Task = {
    id: "task-1",
    title: "Test Task",
    status: "todo",
    createdAt: "2025-11-15T10:00:00Z",
    order: 0,
  };

  const mockTask2: Task = {
    id: "task-2",
    title: "Another Task",
    status: "todo",
    createdAt: "2025-11-15T11:00:00Z",
    order: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the heading text", () => {
    render(<AvailableTasks tasks={[]} onTaskSelect={mockOnTaskSelect} />);

    expect(screen.getByText("Select a task to focus on")).toBeInTheDocument();
  });

  it("renders task buttons for each task", () => {
    const tasks = [mockTask1, mockTask2];

    render(<AvailableTasks tasks={tasks} onTaskSelect={mockOnTaskSelect} />);

    expect(screen.getByText("Test Task")).toBeInTheDocument();
    expect(screen.getByText("Another Task")).toBeInTheDocument();
  });

  it("calls onTaskSelect when a task button is clicked", async () => {
    const user = userEvent.setup({ delay: null });
    const tasks = [mockTask1, mockTask2];

    render(<AvailableTasks tasks={tasks} onTaskSelect={mockOnTaskSelect} />);

    const taskButton = screen.getByRole("button", {
      name: "Select Test Task",
    });
    await user.click(taskButton);

    expect(mockOnTaskSelect).toHaveBeenCalledWith("task-1");
    expect(mockOnTaskSelect).toHaveBeenCalledTimes(1);
  });

  it("renders all task buttons with correct aria-labels", () => {
    const tasks = [mockTask1, mockTask2];

    render(<AvailableTasks tasks={tasks} onTaskSelect={mockOnTaskSelect} />);

    expect(
      screen.getByRole("button", { name: "Select Test Task" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Select Another Task" }),
    ).toBeInTheDocument();
  });

  it("renders only the heading when no tasks are provided", () => {
    render(<AvailableTasks tasks={[]} onTaskSelect={mockOnTaskSelect} />);

    expect(screen.getByText("Select a task to focus on")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
