import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { fireEvent, screen } from "@testing-library/react";
import type React from "react";
import { act, type ReactNode } from "react";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { type TaskContext } from "@web/views/Day/context/TaskContext";
import { describe, expect, it, mock, test } from "bun:test";

const mockRecipeInit = mock(() => ({}));
const mockSuperTokensInit = mock();

mock.module("supertokens-web-js", () => ({
  default: {
    init: mockSuperTokensInit,
  },
}));

mock.module("supertokens-web-js/recipe/emailpassword", () => ({
  default: {
    init: mockRecipeInit,
  },
}));

mock.module("supertokens-web-js/recipe/emailverification", () => ({
  default: {
    init: mockRecipeInit,
  },
}));

mock.module("supertokens-web-js/recipe/thirdparty", () => ({
  default: {
    init: mockRecipeInit,
  },
}));

mock.module("supertokens-web-js/recipe/session", () => ({
  attemptRefreshingSession: mock(),
  default: {
    attemptRefreshingSession: mock(),
    doesSessionExist: mock().mockResolvedValue(true),
    getAccessToken: mock().mockResolvedValue("mock-access-token"),
    getAccessTokenPayloadSecurely: mock().mockResolvedValue({}),
    getInvalidClaimsFromResponse: mock().mockResolvedValue([]),
    getUserId: mock().mockResolvedValue("mock-user-id"),
    init: mockRecipeInit,
    signOut: mock().mockResolvedValue(undefined),
    validateClaims: mock().mockResolvedValue([]),
  },
}));

mock.module("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }: { children: ReactNode }) => children,
  useGoogleLogin: () => mock(),
}));

mock.module("@floating-ui/react", () => ({
  autoUpdate: mock(),
  inline: mock(() => ({})),
  offset: mock(() => ({})),
  useFloating: mock(() => ({
    refs: {
      setReference: mock(),
      setFloating: mock(),
    },
    floatingStyles: {},
  })),
}));

const { render } =
  require("@web/__tests__/__mocks__/mock.render") as typeof import("@web/__tests__/__mocks__/mock.render");
const { DraggableTask } =
  require("@web/views/Day/components/Task/DraggableTask") as typeof import("@web/views/Day/components/Task/DraggableTask");

const mockTask = createMockTask({ _id: "task-1" });

const defaultTasksProps: NonNullable<React.ContextType<typeof TaskContext>> = {
  tasks: [mockTask, { ...mockTask, _id: "task-2", title: "Another Task" }],
  editingTaskId: null,
  editingTitle: "",
  setSelectedTaskIndex: mock(),
  onCheckboxKeyDown: mock(),
  onInputBlur: mock(),
  onInputClick: mock(),
  onInputKeyDown: mock(),
  onTitleChange: mock(),
  onStatusToggle: mock(),
  migrateTask: mock(),
  deleteTask: mock(),
  reorderTasks: mock(),
  addTask: mock(),
  // Add missing properties with default values/mocks
  isAddingTask: false,
  isCancellingEdit: false,
  isLoadingTasks: false,
  selectedTaskIndex: -1,
  undoState: null,
  undoToastId: null,
  restoreTask: mock(),
  focusOnCheckbox: mock(),
  focusOnInput: mock(),
  setEditingTitle: mock(),
  setEditingTaskId: mock(),
  setIsAddingTask: mock(),
  setIsCancellingEdit: mock(),
  toggleTaskStatus: mock(),
  updateTaskTitle: mock(),
};

const renderDraggableTask = (
  task = mockTask,
  index = 0,
  tasksProps = defaultTasksProps,
) => {
  return render(
    <DragDropContext onDragEnd={mock()}>
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
    expect(descriptionId).toBe(`description-${mockTask._id}`);

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

  test("drag handle should be visible when dragging the handler button", () => {
    const draggingTask = { ...mockTask, _id: "task-dragging" };

    renderDraggableTask(draggingTask);

    const dragHandle = screen.getByRole("button", {
      name: /Reorder Test Task/i,
    });

    expect(dragHandle).toHaveClass("opacity-0");

    act(() => {
      fireEvent.mouseOver(dragHandle);
      fireEvent.mouseDown(dragHandle, { bubbles: true });
      fireEvent.mouseMove(dragHandle, { clientY: 100 });
    });

    expect(dragHandle).toHaveClass("opacity-100");

    act(() => {
      fireEvent.mouseUp(dragHandle);
    });
  });
});
