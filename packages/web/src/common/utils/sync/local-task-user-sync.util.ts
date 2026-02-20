import { getUserId } from "@web/auth/auth.util";
import { UNAUTHENTICATED_USER } from "@web/common/constants/auth.constants";
import {
  ensureStorageReady,
  getStorageAdapter,
} from "@web/common/storage/adapter/adapter";
import { Task } from "@web/common/types/task.types";

export async function syncLocalTaskUsersToAuthenticatedUser(): Promise<number> {
  await ensureStorageReady();

  const userId = await getUserId();
  if (!userId || userId === UNAUTHENTICATED_USER) {
    return 0;
  }

  const adapter = getStorageAdapter();
  const allTasks = await adapter.getAllTasks();
  if (allTasks.length === 0) {
    return 0;
  }

  const tasksByDateKey = new Map<string, Task[]>();

  for (const storedTask of allTasks) {
    const { dateKey, ...task } = storedTask;
    const tasksForDate = tasksByDateKey.get(dateKey);
    if (tasksForDate) {
      tasksForDate.push(task);
      continue;
    }

    tasksByDateKey.set(dateKey, [task]);
  }

  let syncedCount = 0;

  for (const [dateKey, tasks] of tasksByDateKey.entries()) {
    let isDateUpdated = false;

    const updatedTasks = tasks.map((task) => {
      if (task.user !== UNAUTHENTICATED_USER) {
        return task;
      }

      syncedCount += 1;
      isDateUpdated = true;
      return { ...task, user: userId };
    });

    if (!isDateUpdated) {
      continue;
    }

    await adapter.putTasks(dateKey, updatedTasks);
  }

  return syncedCount;
}
