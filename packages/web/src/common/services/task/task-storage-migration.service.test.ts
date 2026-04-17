import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import {
  type MigrateLocalToCloudParams,
  migrateLocalToCloud,
} from "./task-storage-migration.service";
import { describe, expect, it, mock } from "bun:test";

describe("migrateLocalToCloud", () => {
  const createParams = () => {
    return {
      dateKeys: ["2024-01-01", "2024-01-02"],
      localRepository: {
        get: mock().mockResolvedValue([]),
        save: mock().mockResolvedValue(undefined),
        delete: mock().mockResolvedValue(undefined),
        move: mock().mockResolvedValue(undefined),
        reorder: mock().mockResolvedValue(undefined),
      },
      cloudRepository: {
        get: mock().mockResolvedValue([]),
        save: mock().mockResolvedValue(undefined),
        delete: mock().mockResolvedValue(undefined),
        move: mock().mockResolvedValue(undefined),
        reorder: mock().mockResolvedValue(undefined),
      },
    } satisfies MigrateLocalToCloudParams;
  };

  it("migrates tasks and clears local data after successful upload", async () => {
    const params = createParams();
    const tasks = [
      createMockTask({ _id: "task-1" }),
      createMockTask({ _id: "task-2" }),
    ];
    params.localRepository.get
      .mockResolvedValueOnce(tasks)
      .mockResolvedValueOnce([]);

    const result = await migrateLocalToCloud(params);

    expect(params.cloudRepository.save).toHaveBeenCalledWith(
      "2024-01-01",
      tasks,
    );
    expect(params.localRepository.save).toHaveBeenCalledWith("2024-01-01", []);
    expect(result.migrated).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.failures).toEqual([]);
  });

  it("reports failures and keeps local data when cloud upload fails", async () => {
    const params = createParams();
    const tasks = [createMockTask({ _id: "task-1" })];
    const uploadError = new Error("cloud unavailable");
    params.localRepository.get
      .mockResolvedValueOnce(tasks)
      .mockResolvedValueOnce([]);
    params.cloudRepository.save.mockRejectedValue(uploadError);

    const result = await migrateLocalToCloud(params);

    expect(params.cloudRepository.save).toHaveBeenCalledWith(
      "2024-01-01",
      tasks,
    );
    expect(params.localRepository.save).not.toHaveBeenCalled();
    expect(result.migrated).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.failures).toHaveLength(1);
  });

  it("preserves task ids during migration", async () => {
    const params = createParams();
    const tasks = [
      createMockTask({ _id: "507f1f77bcf86cd799439011" }),
      createMockTask({ _id: "legacy-task-id" }),
    ];

    params.localRepository.get
      .mockResolvedValueOnce(tasks)
      .mockResolvedValueOnce([]);

    await migrateLocalToCloud(params);

    expect(params.cloudRepository.save).toHaveBeenCalledWith(
      "2024-01-01",
      expect.arrayContaining([
        expect.objectContaining({ _id: "507f1f77bcf86cd799439011" }),
        expect.objectContaining({ _id: "legacy-task-id" }),
      ]),
    );
  });
});
