import React, { act } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { Task } from "@web/common/types/task.types";
import { DraggableTask } from "@web/views/Day/components/Task/DraggableTask";
import { TaskContext } from "@web/views/Day/context/TaskContext";

const mockTask: Task = {
  id: "task-1",
  title: "Test Task",
  order: 0,
  status: "todo",
  createdAt: "2023-01-01",
};

const defaultTasksProps: NonNullable<React.ContextType<typeof TaskContext>> = {
  tasks: [mockTask, { ...mockTask, id: "task-2", title: "Another Task" }],
  editingTaskId: null,
  editingTitle: "",
  setSelectedTaskIndex: jest.fn(),
  onCheckboxKeyDown: jest.fn(),
  onInputBlur: jest.fn(),
  onInputClick: jest.fn(),
  onInputKeyDown: jest.fn(),
  onTitleChange: jest.fn(),
  onStatusToggle: jest.fn(),
  migrateTask: jest.fn(),
  deleteTask: jest.fn(),
  reorderTasks: jest.fn(),
  addTask: jest.fn(),
  // Add missing properties with default values/mocks
  isAddingTask: false,
  isCancellingEdit: false,
  selectedTaskIndex: -1,
  undoState: null,
  undoToastId: null,
  restoreTask: jest.fn(),
  focusOnCheckbox: jest.fn(),
  focusOnInput: jest.fn(),
  setEditingTitle: jest.fn(),
  setEditingTaskId: jest.fn(),
  setIsAddingTask: jest.fn(),
  setIsCancellingEdit: jest.fn(),
  toggleTaskStatus: jest.fn(),
  updateTaskTitle: jest.fn(),
};

const renderDraggableTask = (
  task = mockTask,
  index = 0,
  tasksProps = defaultTasksProps,
) => {
  return act(() =>
    render(<DraggableTask task={task} index={index} tasksProps={tasksProps} />),
  );
};

describe("DraggableTask", () => {
  it("should render the task", () => {
    renderDraggableTask();
    expect(screen.getByDisplayValue("Test Task")).toBeInTheDocument();
  });

  it("should render drag handle when there are multiple tasks", () => {
    renderDraggableTask();

    const dragHandle = screen.getByRole("button", {
      name: /Reorder Test Task/i,
    });

    expect(dragHandle).toBeInTheDocument();
  });

  it("should not render the drag handle when there is only one task", () => {
    const tasksProps = {
      ...defaultTasksProps,
      tasks: [mockTask],
    };

    renderDraggableTask(mockTask, 0, tasksProps);

    const dragHandle = screen.queryByRole("button", {
      name: /Reorder Test Task/i,
    });

    expect(dragHandle).not.toBeInTheDocument();
  });

  it("should have accessible description", () => {
    renderDraggableTask();
    const dragHandle = screen.getByRole("button", {
      name: /Reorder Test Task/i,
    });
    const descriptionId = dragHandle.getAttribute("aria-describedby");
    expect(descriptionId).toBe(`description-${mockTask.id}`);

    const description = screen.getByText(
      "Press space to start dragging this task.",
    );
    expect(description).toBeInTheDocument();
    expect(description.id).toBe(descriptionId);
  });

  it("should be hidden by default", () => {
    renderDraggableTask();
    const dragHandle = screen.getByRole("button", {
      name: /Reorder Test Task/i,
    });

    // Hidden by default
    expect(dragHandle).toHaveClass("opacity-0");

    // Visible on hover (button)
    expect(dragHandle).toHaveClass("hover:opacity-100");

    // Visible on group hover (parent)
    expect(dragHandle).toHaveClass("group-hover:opacity-100");

    // Visible on focus
    expect(dragHandle).toHaveClass("focus:opacity-100");
  });
});
