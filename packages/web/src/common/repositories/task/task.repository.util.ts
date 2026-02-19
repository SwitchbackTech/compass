import { CloudTaskRepository } from "./cloud.task.repository";
import { LocalTaskRepository } from "./local.task.repository";
import { TaskRepository } from "./task.repository";

export type TaskStorageMode = "local" | "cloud";

export function getTaskRepository(
  storageMode: TaskStorageMode = "local",
): TaskRepository {
  if (storageMode === "cloud") {
    return new CloudTaskRepository();
  }

  return new LocalTaskRepository();
}
