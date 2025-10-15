import { Task } from "../types";

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
