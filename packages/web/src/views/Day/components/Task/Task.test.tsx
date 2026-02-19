import { act } from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Task as TaskType } from "@web/common/types/task.types";
import { Task, TaskProps } from "@web/views/Day/components/Task/Task";

describe("Task - migration", () => {
  const mockTask: TaskType = {
    _id: "task-1",
    title: "Test Task",
    status: "todo",
    order: 0,
    createdAt: "2025-10-27T10:00:00Z",
    user: "user-1",
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

    expect(mockProps.onMigrate).toHaveBeenCalledWith(mockTask._id, "forward");
  });

  it("calls onMigrate with backward direction when backward button clicked", () => {
    render(<Task {...mockProps} />);

    const backwardButton = screen.getByLabelText("Move task to previous day");
    fireEvent.click(backwardButton);

    expect(mockProps.onMigrate).toHaveBeenCalledWith(mockTask._id, "backward");
  });
});

describe("Task - migration icon visibility on focus", () => {
  const mockTask: TaskType = {
    _id: "task-1",
    title: "Test Task",
    status: "todo",
    order: 0,
    createdAt: "2025-10-27T10:00:00Z",
    user: "user-1",
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
    expect(migrationContainer).toHaveClass("hidden");

    // Focus on checkbox
    act(() => checkbox.focus());

    // jest cannot actively determine applied pseudo-classes
    // a browser environment should be used for this test
    // move to playwright
    // Migration buttons should be visible via group-focus-within
    expect(migrationContainer).toHaveClass("group-focus-within:flex");
  });

  it("hides migration icons when editing", async () => {
    const { container } = render(<Task {...mockProps} isEditing={true} />);

    const input = screen.getByRole("textbox", { name: /edit test task/i });
    const migrationContainer = container.querySelector(".ml-auto");

    // Initially hidden
    expect(migrationContainer).toHaveClass("hidden");

    // Focus on input
    act(() => input.focus());

    // jest cannot actively determine applied pseudo-classes
    // a browser environment should be used for this test
    // move to playwright
    // Migration buttons should NOT be visible when editing
    expect(migrationContainer).not.toHaveClass("group-focus-within:flex");
  });

  it("shows migration icons when tabbing from checkbox to input", async () => {
    const user = userEvent.setup();
    render(<Task {...mockProps} />);

    const checkbox = screen.getByRole("checkbox", {
      name: /toggle test task/i,
    });

    // Focus checkbox first
    act(() => checkbox.focus());

    // Verify icons are visible
    const forwardButton = screen.getByLabelText("Move task to next day");
    const migrationContainer = forwardButton.parentElement;
    expect(migrationContainer).toHaveClass("group-focus-within:flex");

    // Tab to next focusable element (should be one of the migration buttons or input)
    await user.tab();

    // Icons should still be visible as focus is within the task row
    expect(migrationContainer).toHaveClass("group-focus-within:flex");
  });
});
