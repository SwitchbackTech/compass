import { Task } from "@web/common/types/task.types";

/**
 * Sorts tasks by status, placing incomplete tasks first and completed tasks last.
 * Maintains the original order within each group.
 *
 * @param tasks - Array of tasks to sort
 * @returns New array with tasks sorted by status
 */
export function sortTasksByStatus(tasks: Task[]): Task[] {
  const incompleteTasks = tasks.filter((task) => task.status !== "completed");
  const completedTasks = tasks.filter((task) => task.status === "completed");
  return [...incompleteTasks, ...completedTasks];
}

/**
 * Filters incomplete tasks and sorts them by creation date (newest first).
 * Uses array index as a tie-breaker for tasks with identical timestamps.
 *
 * @param tasks - Array of tasks to filter and sort
 * @returns New array containing only incomplete tasks, sorted by creation date (newest first)
 */
export function getIncompleteTasksSorted(tasks: Task[]): Task[] {
  return tasks
    .filter((task) => task.status === "todo")
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      const timeDiff =
        new Date(b.task.createdAt).getTime() -
        new Date(a.task.createdAt).getTime();
      return timeDiff !== 0 ? timeDiff : b.index - a.index;
    })
    .map(({ task }) => task);
}
