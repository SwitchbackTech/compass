import { type Active, type Over } from "@dnd-kit/core";
import { type Task } from "@web/common/types/task.types";
import { buildTaskDndAnnouncements } from "@web/views/Day/components/Tasks/taskDnd.announcements";
import { describe, expect, it } from "bun:test";

const createTask = (id: string, title: string): Task => ({
  _id: id,
  title,
  status: "todo",
  order: 0,
  createdAt: new Date().toISOString(),
});

const tasks = [
  createTask("task-1", "Task 1"),
  createTask("task-2", "Task 2"),
  createTask("task-3", "Task 3"),
];

const ref = (id: string) => ({ id }) as Active & Over;

describe("buildTaskDndAnnouncements", () => {
  const announcements = buildTaskDndAnnouncements(tasks);

  it("announces the dragged task title on start", () => {
    expect(announcements.onDragStart({ active: ref("task-1") })).toBe(
      'Started dragging task "Task 1"',
    );
  });

  it("announces moving below another task", () => {
    expect(
      announcements.onDragOver({ active: ref("task-1"), over: ref("task-2") }),
    ).toBe('Dropped task "Task 1" at new position below Task 2.');
  });

  it("announces moving above another task", () => {
    expect(
      announcements.onDragOver({ active: ref("task-3"), over: ref("task-1") }),
    ).toBe('Dropped task "Task 3" at new position above Task 1.');
  });

  it("stays quiet while hovering the original position", () => {
    expect(
      announcements.onDragOver({ active: ref("task-1"), over: ref("task-1") }),
    ).toBeUndefined();
  });

  it("announces an invalid drop destination", () => {
    expect(announcements.onDragEnd({ active: ref("task-1"), over: null })).toBe(
      "Invalid drop destination. Task 1 returned to its original position.",
    );
  });

  it("stays quiet on a successful drop", () => {
    expect(
      announcements.onDragEnd({ active: ref("task-1"), over: ref("task-2") }),
    ).toBeUndefined();
  });

  it("announces cancellation", () => {
    expect(
      announcements.onDragCancel({ active: ref("task-2"), over: null }),
    ).toBe("Reordering cancelled. Task 2 returned to its original position.");
  });
});
