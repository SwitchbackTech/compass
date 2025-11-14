import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Task } from "@web/views/Day/task.types";
import { AvailableTasks } from "./AvailableTasks";

describe("AvailableTasks", () => {
  const mockOnSelectTask = jest.fn();

  const mockTask1: Task = {
    id: "task-1",
    title: "First Task",
    status: "todo",
    createdAt: "2025-11-15T10:00:00Z",
  };

  const mockTask2: Task = {
    id: "task-2",
    title: "Second Task",
    status: "todo",
    createdAt: "2025-11-15T11:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSelectTask.mockClear();
  });

  it("renders empty state when no tasks are provided", () => {
    render(<AvailableTasks tasks={[]} onSelectTask={mockOnSelectTask} />);

    expect(screen.getByText("No tasks available")).toBeInTheDocument();
    expect(
      screen.getByText("Create tasks in the Day view to focus on them here"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Select a task to focus on"),
    ).not.toBeInTheDocument();
  });

  it("renders heading and task list when tasks are provided", () => {
    render(
      <AvailableTasks
        tasks={[mockTask1, mockTask2]}
        onSelectTask={mockOnSelectTask}
      />,
    );

    expect(screen.getByText("Select a task to focus on")).toBeInTheDocument();
    expect(screen.getByText("First Task")).toBeInTheDocument();
    expect(screen.getByText("Second Task")).toBeInTheDocument();
    expect(screen.queryByText("No tasks available")).not.toBeInTheDocument();
  });

  it("renders all tasks in the list", () => {
    const tasks = [mockTask1, mockTask2];
    render(<AvailableTasks tasks={tasks} onSelectTask={mockOnSelectTask} />);

    const taskButtons = screen.getAllByRole("button");
    expect(taskButtons).toHaveLength(2);
    expect(screen.getByText("First Task")).toBeInTheDocument();
    expect(screen.getByText("Second Task")).toBeInTheDocument();
  });

  it("calls onSelectTask when a task is clicked", async () => {
    const user = userEvent.setup();
    render(
      <AvailableTasks
        tasks={[mockTask1, mockTask2]}
        onSelectTask={mockOnSelectTask}
      />,
    );

    const firstTask = screen.getByText("First Task").closest('[role="button"]');
    expect(firstTask).toBeInTheDocument();

    await user.click(firstTask!);

    expect(mockOnSelectTask).toHaveBeenCalledWith("task-1");
    expect(mockOnSelectTask).toHaveBeenCalledTimes(1);
  });

  it("calls onSelectTask with correct task ID for each task", async () => {
    const user = userEvent.setup();
    render(
      <AvailableTasks
        tasks={[mockTask1, mockTask2]}
        onSelectTask={mockOnSelectTask}
      />,
    );

    const firstTask = screen.getByText("First Task").closest('[role="button"]');
    const secondTask = screen
      .getByText("Second Task")
      .closest('[role="button"]');

    await user.click(firstTask!);
    expect(mockOnSelectTask).toHaveBeenCalledWith("task-1");

    await user.click(secondTask!);
    expect(mockOnSelectTask).toHaveBeenCalledWith("task-2");
    expect(mockOnSelectTask).toHaveBeenCalledTimes(2);
  });

  it("calls onSelectTask when Enter key is pressed on a task", async () => {
    const user = userEvent.setup();
    render(
      <AvailableTasks tasks={[mockTask1]} onSelectTask={mockOnSelectTask} />,
    );

    const taskButton = screen
      .getByText("First Task")
      .closest('[role="button"]');
    expect(taskButton).toBeInTheDocument();

    (taskButton as HTMLElement).focus();
    await user.keyboard("{Enter}");

    expect(mockOnSelectTask).toHaveBeenCalledWith("task-1");
    expect(mockOnSelectTask).toHaveBeenCalledTimes(1);
  });

  it("calls onSelectTask when Space key is pressed on a task", async () => {
    const user = userEvent.setup();
    render(
      <AvailableTasks tasks={[mockTask1]} onSelectTask={mockOnSelectTask} />,
    );

    const taskButton = screen
      .getByText("First Task")
      .closest('[role="button"]');
    expect(taskButton).toBeInTheDocument();

    (taskButton as HTMLElement).focus();
    await user.keyboard(" ");

    expect(mockOnSelectTask).toHaveBeenCalledWith("task-1");
    expect(mockOnSelectTask).toHaveBeenCalledTimes(1);
  });

  it("does not call onSelectTask when other keys are pressed", async () => {
    const user = userEvent.setup();
    render(
      <AvailableTasks tasks={[mockTask1]} onSelectTask={mockOnSelectTask} />,
    );

    const taskButton = screen
      .getByText("First Task")
      .closest('[role="button"]');
    expect(taskButton).toBeInTheDocument();

    (taskButton as HTMLElement).focus();
    await user.keyboard("{Escape}");

    expect(mockOnSelectTask).not.toHaveBeenCalled();
  });

  it("renders tasks with correct accessibility attributes", () => {
    render(
      <AvailableTasks tasks={[mockTask1]} onSelectTask={mockOnSelectTask} />,
    );

    const taskButton = screen
      .getByText("First Task")
      .closest('[role="button"]');
    expect(taskButton).toHaveAttribute("role", "button");
    expect(taskButton).toHaveAttribute("tabIndex", "0");
  });

  it("handles single task correctly", () => {
    render(
      <AvailableTasks tasks={[mockTask1]} onSelectTask={mockOnSelectTask} />,
    );

    expect(screen.getByText("Select a task to focus on")).toBeInTheDocument();
    expect(screen.getByText("First Task")).toBeInTheDocument();
    const taskButtons = screen.getAllByRole("button");
    expect(taskButtons).toHaveLength(1);
  });
});
