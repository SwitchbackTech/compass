import { Task } from "@web/common/types/task.types";

export type TaskSessionStatus = "idle" | "loading" | "ready" | "error";

export interface TaskSessionSnapshot {
  dateKey: string | null;
  tasks: Task[];
  status: TaskSessionStatus;
  didLoadFail: boolean;
}

export type TaskUpdater = Task[] | ((prevTasks: Task[]) => Task[]);
