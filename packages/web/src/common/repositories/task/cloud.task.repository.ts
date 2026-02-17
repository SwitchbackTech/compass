import { Task } from "@web/common/types/task.types";
import { TaskRepository } from "./task.repository";

export class CloudTaskRepository implements TaskRepository {
  private createNotImplementedError(method: string): Error {
    return new Error(`CloudTaskRepository.${method} is not implemented`);
  }

  async get(_dateKey: string): Promise<Task[]> {
    throw this.createNotImplementedError("get");
  }

  async save(_dateKey: string, _tasks: Task[]): Promise<void> {
    throw this.createNotImplementedError("save");
  }

  async delete(_dateKey: string, _taskId: string): Promise<void> {
    throw this.createNotImplementedError("delete");
  }

  async move(
    _task: Task,
    _fromDateKey: string,
    _toDateKey: string,
  ): Promise<void> {
    throw this.createNotImplementedError("move");
  }

  async reorder(
    _dateKey: string,
    _sourceIndex: number,
    _destinationIndex: number,
  ): Promise<void> {
    throw this.createNotImplementedError("reorder");
  }
}
