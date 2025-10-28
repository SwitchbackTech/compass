import { act } from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Task as TaskType } from "../../task.types";
import { Task, TaskProps } from "./Task";

describe("Task - migration", () => {
  const mockTask: TaskType = {
    id: "task-1",
    title: "Test Task",
    status: "todo",
    createdAt: "2025-10-27T10:00:00Z",
  };

  const mockProps: TaskProps = {
    task: mockTask,
    index: 0,
    title: "Test Task",
    isEditing: false,
    onCheckboxKeyDown: jest.fn(),
    onInputBlur: jest.fn(),
    onInputClick: jest.fn(),
    onInputKeyDown: jest.fn(),
    onStatusToggle: jest.fn(),
    onTitleChange: jest.fn(),
    onFocus: jest.fn(),
    onMigrate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders migration buttons", () => {
    render(<Task {...mockProps} />);

    const forwardButton = screen.getByLabelText("Move task to next day");
    const backwardButton = screen.getByLabelText("Move task to previous day");

    expect(forwardButton).toBeInTheDocument();
    expect(backwardButton).toBeInTheDocument();
  });

  it("calls onMigrate with forward direction when forward button clicked", () => {
    render(<Task {...mockProps} />);

    const forwardButton = screen.getByLabelText("Move task to next day");
    fireEvent.click(forwardButton);

    expect(mockProps.onMigrate).toHaveBeenCalledWith(mockTask.id, "forward");
  });

  it("calls onMigrate with backward direction when backward button clicked", () => {
    render(<Task {...mockProps} />);

    const backwardButton = screen.getByLabelText("Move task to previous day");
    fireEvent.click(backwardButton);

    expect(mockProps.onMigrate).toHaveBeenCalledWith(mockTask.id, "backward");
  });
});

describe("Task - migration icon visibility on focus", () => {
  const mockTask: TaskType = {
    id: "task-1",
    title: "Test Task",
    status: "todo",
    createdAt: "2025-10-27T10:00:00Z",
  };

  const mockProps: TaskProps = {
    task: mockTask,
    index: 0,
    title: "Test Task",
    isEditing: false,
    onCheckboxKeyDown: jest.fn(),
    onInputBlur: jest.fn(),
    onInputClick: jest.fn(),
    onInputKeyDown: jest.fn(),
    onStatusToggle: jest.fn(),
    onTitleChange: jest.fn(),
    onFocus: jest.fn(),
    onMigrate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows migration icons when checkbox button is focused", async () => {
    const { container } = render(<Task {...mockProps} />);

    const checkbox = screen.getByRole("checkbox", {
      name: /toggle test task/i,
    });
    const migrationContainer = container.querySelector(".ml-auto");

    // Initially hidden
    expect(migrationContainer).toHaveClass("opacity-0");

    // Focus on checkbox
    await act(() => checkbox.focus());

    // Migration buttons should be visible via group-focus-within
    const forwardButton = screen.getByLabelText("Move task to next day");
    const backwardButton = screen.getByLabelText("Move task to previous day");

    expect(forwardButton).toBeVisible();
    expect(backwardButton).toBeVisible();
  });

  it("shows migration icons when input is focused via click", async () => {
    const { container } = render(<Task {...mockProps} isEditing={true} />);

    const input = screen.getByRole("textbox", { name: /edit test task/i });
    const migrationContainer = container.querySelector(".ml-auto");

    // Initially hidden
    expect(migrationContainer).toHaveClass("opacity-0");

    // Focus on input
    await act(() => input.focus());

    // Migration buttons should be visible
    const forwardButton = screen.getByLabelText("Move task to next day");
    const backwardButton = screen.getByLabelText("Move task to previous day");

    expect(forwardButton).toBeVisible();
    expect(backwardButton).toBeVisible();
  });

  it("shows migration icons when tabbing from checkbox to input", async () => {
    const user = userEvent.setup();
    render(<Task {...mockProps} />);

    const checkbox = screen.getByRole("checkbox", {
      name: /toggle test task/i,
    });

    // Focus checkbox first
    await act(() => checkbox.focus());

    // Verify icons are visible
    let forwardButton = screen.getByLabelText("Move task to next day");
    expect(forwardButton).toBeVisible();

    // Tab to next focusable element (should be one of the migration buttons or input)
    await user.tab();

    // Icons should still be visible as focus is within the task row
    forwardButton = screen.getByLabelText("Move task to next day");
    expect(forwardButton).toBeVisible();
  });
});
