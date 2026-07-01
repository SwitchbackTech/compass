import { getOfflineDataStore } from "@web/common/storage/offline-data/offline-data.store.registry";
import { type Task } from "@web/common/types/task.types";
import { dispatchTasksSavedEvent } from "@web/common/utils/storage/storage.util";
import { type TaskRepository } from "./task.repository";

/**
 * Local task repository implementation using the offline data store.
 *
 * This repository delegates all storage operations to the OfflineDataStore,
 * making it independent of the underlying storage technology. The store
 * can be IndexedDB, SQLite, or any other implementation.
 */
export class LocalTaskRepository implements TaskRepository {
  private get store() {
    return getOfflineDataStore();
  }

  async get(dateKey: string): Promise<Task[]> {
    return this.store.getTasks(dateKey);
  }

  async save(dateKey: string, taskOrTasks: Task | Task[]): Promise<void> {
    const tasks = Array.isArray(taskOrTasks) ? taskOrTasks : [taskOrTasks];
    if (tasks.length === 1 && !Array.isArray(taskOrTasks)) {
      await this.store.putTask(dateKey, tasks[0]);
    } else {
      await this.store.putTasks(dateKey, tasks);
    }
    dispatchTasksSavedEvent(dateKey);
  }

  async delete(dateKey: string, taskId: string): Promise<void> {
    const tasksForDate = await this.get(dateKey);
    const isTaskInDate = tasksForDate.some((task) => task._id === taskId);

    if (!isTaskInDate) {
      return;
    }

    await this.store.deleteTask(taskId);
  }

  async move(
    task: Task,
    fromDateKey: string,
    toDateKey: string,
  ): Promise<void> {
    await this.store.moveTask(task, fromDateKey, toDateKey);
  }

  async reorder(
    dateKey: string,
    sourceIndex: number,
    destinationIndex: number,
  ): Promise<void> {
    const tasks = await this.get(dateKey);
    if (tasks.length <= 1) {
      return;
    }

    const isSourceIndexValid = sourceIndex >= 0 && sourceIndex < tasks.length;
    if (!isSourceIndexValid) {
      return;
    }

    const boundedDestinationIndex = Math.max(
      0,
      Math.min(destinationIndex, tasks.length - 1),
    );

    if (sourceIndex === boundedDestinationIndex) {
      return;
    }

    const newTasks = Array.from(tasks);
    const [moved] = newTasks.splice(sourceIndex, 1);
    newTasks.splice(boundedDestinationIndex, 0, moved);

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
