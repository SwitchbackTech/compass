import { Task } from "@web/common/types/task.types";

export interface TaskRepository {
  get(dateKey: string): Task[];
  save(dateKey: string, tasks: Task[]): void;
  delete(dateKey: string, taskId: string): void;
  reorder(dateKey: string, sourceIndex: number, destinationIndex: number): void;
}
