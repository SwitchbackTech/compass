import { CloudTaskRepository } from "./cloud.task.repository";
import { LocalTaskRepository } from "./local.task.repository";
import { getTaskRepository } from "./task.repository.util";

describe("getTaskRepository", () => {
  it("returns LocalTaskRepository by default", () => {
    const repository = getTaskRepository();

    expect(repository).toBeInstanceOf(LocalTaskRepository);
  });

  it("returns LocalTaskRepository for local storage mode", () => {
    const repository = getTaskRepository("local");

    expect(repository).toBeInstanceOf(LocalTaskRepository);
  });

  it("returns CloudTaskRepository for cloud storage mode", () => {
    const repository = getTaskRepository("cloud");

    expect(repository).toBeInstanceOf(CloudTaskRepository);
  });
});
