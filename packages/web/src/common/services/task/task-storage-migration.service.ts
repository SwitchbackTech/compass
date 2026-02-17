import { TaskRepository } from "@web/common/repositories/task/task.repository";

export interface TaskStorageMigrationFailure {
  dateKey: string;
  taskCount: number;
  error: unknown;
}

export interface TaskStorageMigrationResult {
  migrated: number;
  failed: number;
  failures: TaskStorageMigrationFailure[];
}

export interface MigrateLocalToCloudParams {
  dateKeys: string[];
  localRepository: TaskRepository;
  cloudRepository: TaskRepository;
}

export async function migrateLocalToCloud({
  dateKeys,
  localRepository,
  cloudRepository,
}: MigrateLocalToCloudParams): Promise<TaskStorageMigrationResult> {
  let migrated = 0;
  let failed = 0;
  const failures: TaskStorageMigrationFailure[] = [];

  for (const dateKey of dateKeys) {
    try {
      const tasks = await localRepository.get(dateKey);
      const taskCount = tasks.length;

      if (taskCount === 0) {
        continue;
      }

      try {
        await cloudRepository.save(dateKey, tasks);
        await localRepository.save(dateKey, []);
        migrated += taskCount;
      } catch (error) {
        failed += taskCount;
        failures.push({
          dateKey,
          taskCount,
          error,
        });
      }
    } catch (error) {
      failures.push({
        dateKey,
        taskCount: 0,
        error,
      });
    }
  }

  return {
    migrated,
    failed,
    failures,
  };
}
