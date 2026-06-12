import { type Announcements } from "@dnd-kit/core";
import { type Task } from "@web/common/types/task.types";

export const TASK_DND_SCREEN_READER_INSTRUCTIONS = {
  draggable:
    "To pick up a task, press space or enter. Use arrow keys to move, space to drop, or escape to cancel.",
} as const;

export function buildTaskDndAnnouncements(tasks: Task[]): Announcements {
  const getTaskIndex = (id: unknown) =>
    tasks.findIndex((task) => task._id === id);

  return {
    onDragStart({ active }) {
      const task = tasks[getTaskIndex(active.id)];

      return `Started dragging task "${task?.title}"`;
    },
    onDragOver({ active, over }) {
      // Skip the self-over event dnd-kit fires on lift so it doesn't
      // immediately overwrite the "Started dragging" announcement.
      if (!over || over.id === active.id) return undefined;

      const sourceIndex = getTaskIndex(active.id);
      const destinationIndex = getTaskIndex(over.id);
      const task = tasks[sourceIndex];
      const replaceTask = tasks[destinationIndex];
      const _suffix = destinationIndex < sourceIndex ? "above" : "below";
      const suffix = replaceTask?.title
        ? ` ${_suffix} ${replaceTask.title}`
        : "";

      return `Dropped task "${task?.title}" at new position${suffix}.`;
    },
    onDragEnd({ active, over }) {
      if (!over) {
        const task = tasks[getTaskIndex(active.id)];

        return `Invalid drop destination. ${task?.title} returned to its original position.`;
      }

      return undefined;
    },
    onDragCancel({ active }) {
      const task = tasks[getTaskIndex(active.id)];

      return `Reordering cancelled. ${task?.title} returned to its original position.`;
    },
  };
}
