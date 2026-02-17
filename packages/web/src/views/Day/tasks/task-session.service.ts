import { TaskRepository } from "@web/common/repositories/task/task.repository";
import { Task } from "@web/common/types/task.types";
import { sortTasksByStatus } from "@web/common/utils/task/sort.task";
import {
  TaskSessionSnapshot,
  TaskUpdater,
} from "@web/views/Day/tasks/task-session.types";

type TaskSessionListener = () => void;

const INITIAL_TASK_SESSION_SNAPSHOT: TaskSessionSnapshot = {
  dateKey: null,
  tasks: [],
  status: "idle",
  didLoadFail: false,
};

export class TaskSessionService {
  private snapshot: TaskSessionSnapshot = INITIAL_TASK_SESSION_SNAPSHOT;
  private readonly listeners = new Set<TaskSessionListener>();
  private readonly pendingWrites = new Map<string, Task[]>();
  private readonly saveRunners = new Map<string, Promise<void>>();
  private loadToken = 0;
  private localRevision = 0;

  constructor(private readonly repository: TaskRepository) {}

  getSnapshot = (): TaskSessionSnapshot => this.snapshot;

  subscribe = (listener: TaskSessionListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  openDate = async (dateKey: string): Promise<void> => {
    this.loadToken += 1;
    const currentToken = this.loadToken;
    const isNewDate = this.snapshot.dateKey !== dateKey;

    if (isNewDate) {
      this.localRevision = 0;
      this.setSnapshot({
        dateKey,
        tasks: [],
        status: "loading",
        didLoadFail: false,
      });
    } else {
      this.setSnapshot({
        ...this.snapshot,
        status: "loading",
        didLoadFail: false,
      });
    }

    const localRevisionAtLoadStart = this.localRevision;

    try {
      const loadedTasks = await this.repository.get(dateKey);
      if (!this.isCurrentLoad(currentToken, dateKey)) return;

      const sortedLoadedTasks = sortTasksByStatus(loadedTasks);
      const hasLocalChanges = this.localRevision > localRevisionAtLoadStart;
      const nextTasks = hasLocalChanges
        ? this.mergeLoadedTasksWithLocalTasks(
            this.snapshot.tasks,
            sortedLoadedTasks,
          )
        : sortedLoadedTasks;

      this.setSnapshot({
        dateKey,
        tasks: nextTasks,
        status: "ready",
        didLoadFail: false,
      });

      if (hasLocalChanges) {
        this.queueSave(dateKey, nextTasks);
      }
    } catch (error) {
      if (!this.isCurrentLoad(currentToken, dateKey)) return;

      console.error("Failed to load tasks from repository:", error);
      this.setSnapshot({
        dateKey,
        tasks: [],
        status: "error",
        didLoadFail: true,
      });
    }
  };

  updateTasks = (updater: TaskUpdater): void => {
    const { dateKey, tasks, status, didLoadFail } = this.snapshot;
    if (!dateKey) return;

    const nextTasks = typeof updater === "function" ? updater(tasks) : updater;
    this.localRevision += 1;

    this.setSnapshot({
      dateKey,
      tasks: nextTasks,
      status,
      didLoadFail,
    });

    if (status === "loading") {
      return;
    }

    if (didLoadFail && nextTasks.length === 0) {
      return;
    }

    this.queueSave(dateKey, nextTasks);
  };

  moveTask = async (
    task: Task,
    fromDateKey: string,
    toDateKey: string,
  ): Promise<void> => {
    await this.repository.move(task, fromDateKey, toDateKey);
  };

  flush = async (): Promise<void> => {
    while (this.pendingWrites.size > 0 || this.saveRunners.size > 0) {
      for (const [dateKey, tasks] of this.pendingWrites.entries()) {
        if (!this.saveRunners.has(dateKey)) {
          this.queueSave(dateKey, tasks);
        }
      }

      await Promise.all(this.saveRunners.values());
    }
  };

  private setSnapshot(snapshot: TaskSessionSnapshot): void {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }

  private isCurrentLoad(token: number, dateKey: string): boolean {
    return token === this.loadToken && this.snapshot.dateKey === dateKey;
  }

  private mergeLoadedTasksWithLocalTasks(
    localTasks: Task[],
    loadedTasks: Task[],
  ): Task[] {
    const mergedTasks = [
      ...localTasks,
      ...loadedTasks.filter(
        (loadedTask) =>
          !localTasks.some((localTask) => localTask.id === loadedTask.id),
      ),
    ];

    return sortTasksByStatus(mergedTasks);
  }

  private queueSave(dateKey: string, tasks: Task[]): void {
    this.pendingWrites.set(dateKey, tasks);

    if (this.saveRunners.has(dateKey)) {
      return;
    }

    const runner = this.drainSaveQueue(dateKey).finally(() => {
      this.saveRunners.delete(dateKey);
    });

    this.saveRunners.set(dateKey, runner);
  }

  private async drainSaveQueue(dateKey: string): Promise<void> {
    while (true) {
      const tasks = this.pendingWrites.get(dateKey);

      if (!tasks) {
        return;
      }

      this.pendingWrites.delete(dateKey);

      try {
        await this.repository.save(dateKey, tasks);
      } catch (error) {
        console.error("Failed to save tasks to repository:", error);
      }
    }
  }
}
