import React from "react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { render, screen } from "@testing-library/react";
import { Task } from "@web/common/types/task.types";
import { DraggableTask } from "@web/views/Day/components/Tasks/DraggableTask";
import { TaskContext } from "@web/views/Day/context/TaskProvider";

// Mock useFloating hook
jest.mock("@floating-ui/react", () => ({
  useFloating: () => ({
    refs: {
      setReference: jest.fn(),
      setFloating: jest.fn(),
    },
    floatingStyles: {},
    update: jest.fn(),
  }),
  autoUpdate: jest.fn(),
  offset: jest.fn(),
  inline: jest.fn(),
}));

const mockTask: Task = {
  id: "task-1",
  title: "Test Task",
  order: 0,
  status: "todo",
  createdAt: "2023-01-01",
};

const defaultTasksProps: NonNullable<React.ContextType<typeof TaskContext>> = {
  tasks: [mockTask, { ...mockTask, id: "task-2" }],
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
  return render(
    <DragDropContext onDragEnd={jest.fn()}>
      <Droppable droppableId="test-droppable">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            <DraggableTask task={task} index={index} tasksProps={tasksProps} />
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>,
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

    const dragHandle = screen.getByRole("button", {
      name: /Reorder Test Task/i,
    });

    expect(dragHandle).toHaveClass("hidden");
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
});
