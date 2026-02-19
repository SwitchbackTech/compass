import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { AvailableTasks } from "./AvailableTasks";

describe("AvailableTasks", () => {
  const mockOnTaskSelect = jest.fn();

  const mockTask1 = createMockTask({ _id: "task-1", title: "Test Task" });

  const mockTask2 = createMockTask({ _id: "task-2", title: "Another Task" });

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

    expect(screen.getByText(mockTask1.title)).toBeInTheDocument();
    expect(screen.getByText(mockTask2.title)).toBeInTheDocument();
  });

  it("calls onTaskSelect when a task button is clicked", async () => {
    const user = userEvent.setup({ delay: null });
    const tasks = [mockTask1, mockTask2];

    render(<AvailableTasks tasks={tasks} onTaskSelect={mockOnTaskSelect} />);

    const taskButton = screen.getByRole("button", {
      name: `Select ${mockTask1.title}`,
    });
    await user.click(taskButton);

    expect(mockOnTaskSelect).toHaveBeenCalledWith("task-1");
    expect(mockOnTaskSelect).toHaveBeenCalledTimes(1);
  });

  it("renders all task buttons with correct aria-labels", () => {
    const tasks = [mockTask1, mockTask2];

    render(<AvailableTasks tasks={tasks} onTaskSelect={mockOnTaskSelect} />);

    expect(
      screen.getByRole("button", { name: `Select ${mockTask1.title}` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Select ${mockTask2.title}` }),
    ).toBeInTheDocument();
  });

  it("renders only the heading when no tasks are provided", () => {
    render(<AvailableTasks tasks={[]} onTaskSelect={mockOnTaskSelect} />);

    expect(screen.getByText("Select a task to focus on")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
