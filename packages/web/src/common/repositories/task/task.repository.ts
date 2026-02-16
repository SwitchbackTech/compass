import { Task } from "@web/common/types/task.types";

export interface TaskRepository {
  get(dateKey: string): Promise<Task[]>;
  save(dateKey: string, tasks: Task[]): Promise<void>;
  delete(dateKey: string, taskId: string): Promise<void>;
  reorder(
    dateKey: string,
    sourceIndex: number,
    destinationIndex: number,
  ): Promise<void>;
}
