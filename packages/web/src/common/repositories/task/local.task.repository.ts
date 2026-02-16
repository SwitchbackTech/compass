import { Task } from "@web/common/types/task.types";
import {
  deleteTaskFromIndexedDB,
  loadTasksFromIndexedDB,
  saveTasksToIndexedDB,
} from "@web/common/utils/storage/task.storage.util";
import { TaskRepository } from "./task.repository";

export class LocalTaskRepository implements TaskRepository {
  async get(dateKey: string): Promise<Task[]> {
    return loadTasksFromIndexedDB(dateKey);
  }

  async save(dateKey: string, tasks: Task[]): Promise<void> {
    await saveTasksToIndexedDB(dateKey, tasks);
  }

  async delete(dateKey: string, taskId: string): Promise<void> {
    await deleteTaskFromIndexedDB(taskId);
  }

  async reorder(
    dateKey: string,
    sourceIndex: number,
    destinationIndex: number,
  ): Promise<void> {
    const tasks = await this.get(dateKey);
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

    await this.save(dateKey, newTasks);
  }
}
