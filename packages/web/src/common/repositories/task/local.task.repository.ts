import { Task } from "@web/common/types/task.types";
import {
  loadTasksFromStorage,
  saveTasksToStorage,
} from "@web/common/utils/storage/storage.util";
import { TaskRepository } from "./task.repository";

export class LocalTaskRepository implements TaskRepository {
  get(dateKey: string): Task[] {
    return loadTasksFromStorage(dateKey);
  }

  save(dateKey: string, tasks: Task[]): void {
    saveTasksToStorage(dateKey, tasks);
  }

  delete(dateKey: string, taskId: string): void {
    const tasks = this.get(dateKey);
    const updatedTasks = tasks.filter((task) => task.id !== taskId);
    this.save(dateKey, updatedTasks);
  }

  reorder(
    dateKey: string,
    sourceIndex: number,
    destinationIndex: number,
  ): void {
    const tasks = this.get(dateKey);
    const newTasks = Array.from(tasks);
    const [moved] = newTasks.splice(sourceIndex, 1);
    newTasks.splice(destinationIndex, 0, moved);

    // Update order for todo and completed tasks separately
    const todoTasks = newTasks.filter((t) => t.status === "todo");
    const completedTasks = newTasks.filter((t) => t.status === "completed");
    todoTasks.forEach((task, index) => {
      task.order = index;
    });
    completedTasks.forEach((task, index) => {
      task.order = index;
    });

    this.save(dateKey, newTasks);
  }
}
