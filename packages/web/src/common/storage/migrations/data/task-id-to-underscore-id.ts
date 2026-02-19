import { Task } from "@web/common/types/task.types";
import { StorageAdapter, StoredTask } from "../../adapter/storage.adapter";
import { DataMigration } from "../migration.types";

type RawStoredTask = StoredTask & { id?: string };

function fixTaskId(task: RawStoredTask): Task | null {
  const record = task as unknown as Record<string, unknown>;
  const hasLegacyId = typeof record.id === "string";
  const hasUnderscoreId = typeof record._id === "string";

  if (hasUnderscoreId) {
    const { dateKey: _, ...t } = task; // eslint-disable-line @typescript-eslint/no-unused-vars
    return t as Task;
  }

  if (hasLegacyId) {
    const { id, dateKey: _d, ...rest } = task as RawStoredTask & { id: string }; // eslint-disable-line @typescript-eslint/no-unused-vars
    return { ...rest, _id: id } as Task;
  }

  return null;
}

/**
 * Migrate tasks that were stored with legacy 'id' field to use '_id'.
 *
 * Fixes DatabaseOperationError / ZodError when loading tasks that have
 * undefined _id (e.g. from older localStorage migration or legacy formats).
 */
export const taskIdToUnderscoreIdMigration: DataMigration = {
  id: "task-id-to-underscore-id-v1",
  description: "Migrate task 'id' field to '_id' for stored tasks",

  async migrate(adapter: StorageAdapter): Promise<void> {
    const allTasks = (await adapter.getAllTasks()) as RawStoredTask[];
    if (allTasks.length === 0) return;

    const affectedDateKeys = new Set<string>();
    const byDate = new Map<string, Task[]>();

    for (const raw of allTasks) {
      affectedDateKeys.add(raw.dateKey);

      const fixed = fixTaskId(raw);
      if (!fixed) continue;

      const dateKey = raw.dateKey;
      const list = byDate.get(dateKey) ?? [];
      list.push(fixed);
      byDate.set(dateKey, list);
    }

    for (const dateKey of affectedDateKeys) {
      const tasks = byDate.get(dateKey) ?? [];
      const sorted = [...tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      await adapter.putTasks(dateKey, sorted);
    }
  },
};
