import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { type Task } from "@web/common/types/task.types";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const useTasksMock = mock();

mock.module("@web/views/Day/hooks/tasks/useTasks", () => ({
  useTasks: useTasksMock,
}));

const { Tasks } = require("./Tasks") as typeof import("./Tasks");

const createTask = (id: string, title: string, order: number): Task => ({
  _id: id,
  title,
  status: "todo",
  order,
  createdAt: new Date().toISOString(),
});

const tasks = [
  createTask("task-1", "Task 1", 0),
  createTask("task-2", "Task 2", 1),
  createTask("task-3", "Task 3", 2),
];

const setRect = (
  element: HTMLElement,
  rect: Pick<DOMRect, "height" | "left" | "top" | "width">,
) => {
  const domRect = {
    ...rect,
    bottom: rect.top + rect.height,
    right: rect.left + rect.width,
    x: rect.left,
    y: rect.top,
    toJSON: () => ({}),
  } as DOMRect;

  element.getBoundingClientRect = () => domRect;
};

const reorderTasks = mock();
const setSelectedTaskIndex = mock();

const renderTaskList = () => {
  useTasksMock.mockReturnValue({
    tasks,
    hasLoadedTasksOnce: true,
    isLoadingTasks: false,
    editingTaskId: null,
    editingTitle: "",
    reorderTasks,
    setSelectedTaskIndex,
    onCheckboxKeyDown: mock(),
    onInputBlur: mock(),
    onInputClick: mock(),
    onInputKeyDown: mock(),
    onTitleChange: mock(),
    onStatusToggle: mock(),
    migrateTask: mock(),
  });

  const view = render(<Tasks />);

  // jsdom reports zero-size rects, so give the list and rows real geometry.
  // dnd-kit measures these at drag start to resolve keyboard moves and the
  // restrictToParentElement bounds.
  const dropZone = document.getElementById("task-list-drop-zone");

  if (dropZone) {
    setRect(dropZone, { height: 300, left: 0, top: 0, width: 240 });
  }

  tasks.forEach((task, index) => {
    const row = document.getElementById(task._id);

    if (row) {
      setRect(row, { height: 36, left: 20, top: index * 40, width: 200 });
    }
  });

  return view;
};

const getLiveRegionText = () =>
  Array.from(document.querySelectorAll("[aria-live]"))
    .map((node) => node.textContent)
    .join(" ");

// dnd-kit's KeyboardSensor attaches its move/end keydown listener in a
// setTimeout (so the activating keydown doesn't immediately end the drag),
// so the lift must flush a macrotask before further keys are handled.
const liftTask = async (title: string) => {
  const handle = screen.getByRole("button", { name: `Reorder ${title}` });

  handle.focus();
  fireEvent.keyDown(handle, { code: "Space", key: " " });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
  });

  return handle;
};

describe("Tasks", () => {
  it("does not show loading text during date switches after tasks have loaded once", () => {
    useTasksMock.mockReturnValue({
      hasLoadedTasksOnce: true,
      isLoadingTasks: true,
      tasks: [],
    });

    render(<Tasks />);

    expect(screen.queryByText(/Loading tasks/)).not.toBeInTheDocument();
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
  });
});

describe("Tasks drag and drop", () => {
  beforeEach(() => {
    reorderTasks.mockClear();
    setSelectedTaskIndex.mockClear();
  });

  it("reorders a task one position down via keyboard", async () => {
    renderTaskList();

    const handle = await liftTask("Task 1");

    expect(setSelectedTaskIndex).toHaveBeenCalledWith(0);

    fireEvent.keyDown(handle, { code: "ArrowDown", key: "ArrowDown" });
    fireEvent.keyDown(handle, { code: "Space", key: " " });

    expect(reorderTasks).toHaveBeenCalledWith(0, 1);
  });

  it("announces the drag lifecycle for screen readers", async () => {
    renderTaskList();

    const handle = await liftTask("Task 1");

    expect(getLiveRegionText()).toContain('Started dragging task "Task 1"');

    fireEvent.keyDown(handle, { code: "ArrowDown", key: "ArrowDown" });

    expect(getLiveRegionText()).toContain(
      'Dropped task "Task 1" at new position below Task 2.',
    );
  });

  it("highlights the drop zone only while dragging", async () => {
    renderTaskList();

    const dropZone = document.getElementById("task-list-drop-zone");

    expect(dropZone).not.toHaveClass("border-border-primary");

    const handle = await liftTask("Task 1");

    expect(dropZone).toHaveClass("border-border-primary");

    fireEvent.keyDown(handle, { code: "Space", key: " " });

    expect(dropZone).not.toHaveClass("border-border-primary");
  });

  it("cancels the drag with escape and keeps the original order", async () => {
    renderTaskList();

    const handle = await liftTask("Task 2");

    fireEvent.keyDown(handle, { code: "ArrowDown", key: "ArrowDown" });
    fireEvent.keyDown(handle, { code: "Escape", key: "Escape" });

    expect(reorderTasks).not.toHaveBeenCalled();
    expect(getLiveRegionText()).toContain(
      "Reordering cancelled. Task 2 returned to its original position.",
    );
  });

  it("does not reorder when dropped at the original position", async () => {
    renderTaskList();

    const handle = await liftTask("Task 1");

    fireEvent.keyDown(handle, { code: "Space", key: " " });

    expect(reorderTasks).not.toHaveBeenCalled();
  });
});
