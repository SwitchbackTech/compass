import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { Task as TaskType } from "../../task.types";
import { Task } from "./Task";

// Mock the getMetaKey utility
jest.mock("@web/common/utils/shortcut/shortcut.util", () => ({
  getMetaKey: jest.fn(() => <span data-testid="meta-key">⌘</span>),
}));

// Mock TooltipWrapper
jest.mock("@web/components/Tooltip/TooltipWrapper", () => ({
  TooltipWrapper: ({ children, onClick }: any) => (
    <div onClick={onClick}>{children}</div>
  ),
}));

describe("Task - migration", () => {
  const mockTask: TaskType = {
    id: "task-1",
    title: "Test Task",
    status: "todo",
    createdAt: "2025-10-27T10:00:00Z",
  };

  const mockProps = {
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
