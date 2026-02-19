import { Task } from "@web/common/types/task.types";
import { CloudTaskRepository } from "./cloud.task.repository";

describe("CloudTaskRepository", () => {
  const dateKey = "2024-01-01";
  const task: Task = {
    id: "task-1",
    title: "Task 1",
    status: "todo",
    order: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
  };

  it("throws not implemented for all methods", async () => {
    const repository = new CloudTaskRepository();

    await expect(repository.get(dateKey)).rejects.toThrow(
      "CloudTaskRepository.get is not implemented",
    );
    await expect(repository.save(dateKey, [task])).rejects.toThrow(
      "CloudTaskRepository.save is not implemented",
    );
    await expect(repository.delete(dateKey, task.id)).rejects.toThrow(
      "CloudTaskRepository.delete is not implemented",
    );
    await expect(repository.move(task, dateKey, "2024-01-02")).rejects.toThrow(
      "CloudTaskRepository.move is not implemented",
    );
    await expect(repository.reorder(dateKey, 0, 1)).rejects.toThrow(
      "CloudTaskRepository.reorder is not implemented",
    );
  });
});
