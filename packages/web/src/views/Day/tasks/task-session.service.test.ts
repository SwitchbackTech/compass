import { TaskRepository } from "@web/common/repositories/task/task.repository";
import { Task } from "@web/common/types/task.types";
import { TaskSessionService } from "@web/views/Day/tasks/task-session.service";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("TaskSessionService", () => {
  const createTask = (overrides: Partial<Task>): Task => ({
    id: "task-1",
    title: "Task",
    status: "todo",
    order: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  });

  const createRepository = (): jest.Mocked<TaskRepository> => ({
    get: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    move: jest.fn().mockResolvedValue(undefined),
    reorder: jest.fn().mockResolvedValue(undefined),
  });

  it("loads tasks when a date is opened", async () => {
    const repository = createRepository();
    const loadedTask = createTask({
      id: "loaded-task",
      title: "Loaded Task",
    });
    repository.get.mockResolvedValue([loadedTask]);
    const session = new TaskSessionService(repository);

    await session.openDate("2024-01-01");

    expect(repository.get).toHaveBeenCalledWith("2024-01-01");
    expect(session.getSnapshot().tasks).toEqual([loadedTask]);
    expect(session.getSnapshot().status).toBe("ready");
  });

  it("ignores stale load results when date changes before first load resolves", async () => {
    const repository = createRepository();
    const firstLoad = createDeferred<Task[]>();
    const secondLoad = createDeferred<Task[]>();
    repository.get
      .mockReturnValueOnce(firstLoad.promise)
      .mockReturnValueOnce(secondLoad.promise);
    const session = new TaskSessionService(repository);

    const firstOpen = session.openDate("2024-01-01");
    const secondOpen = session.openDate("2024-01-02");

    firstLoad.resolve([
      createTask({ id: "first-task", title: "First Date Task" }),
    ]);
    secondLoad.resolve([
      createTask({ id: "second-task", title: "Second Date Task" }),
    ]);

    await Promise.all([firstOpen, secondOpen]);

    expect(session.getSnapshot().dateKey).toBe("2024-01-02");
    expect(session.getSnapshot().tasks).toEqual([
      createTask({ id: "second-task", title: "Second Date Task" }),
    ]);
  });

  it("coalesces writes while a save is in flight", async () => {
    const repository = createRepository();
    const firstSave = createDeferred<void>();
    repository.save
      .mockReturnValueOnce(firstSave.promise)
      .mockResolvedValue(undefined);
    const session = new TaskSessionService(repository);

    await session.openDate("2024-01-01");

    session.updateTasks([createTask({ id: "task-1", title: "Task 1" })]);
    session.updateTasks([createTask({ id: "task-2", title: "Task 2" })]);
    session.updateTasks([createTask({ id: "task-3", title: "Task 3" })]);

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenNthCalledWith(1, "2024-01-01", [
      createTask({ id: "task-1", title: "Task 1" }),
    ]);

    firstSave.resolve(undefined);
    await session.flush();

    expect(repository.save).toHaveBeenCalledTimes(2);
    expect(repository.save).toHaveBeenNthCalledWith(2, "2024-01-01", [
      createTask({ id: "task-3", title: "Task 3" }),
    ]);
  });

  it("preserves local edits made while load is pending", async () => {
    const repository = createRepository();
    const loadDeferred = createDeferred<Task[]>();
    repository.get.mockReturnValue(loadDeferred.promise);
    const session = new TaskSessionService(repository);

    const openPromise = session.openDate("2024-01-01");
    session.updateTasks([
      createTask({ id: "local-task", title: "Local Task" }),
    ]);

    loadDeferred.resolve([
      createTask({ id: "loaded-task", title: "Loaded Task", order: 1 }),
    ]);
    await openPromise;

    expect(session.getSnapshot().tasks).toEqual([
      createTask({ id: "local-task", title: "Local Task" }),
      createTask({ id: "loaded-task", title: "Loaded Task", order: 1 }),
    ]);
  });

  it("does not save empty tasks after a load failure until local edits occur", async () => {
    const repository = createRepository();
    repository.get.mockRejectedValue(new Error("load failed"));
    const session = new TaskSessionService(repository);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    await session.openDate("2024-01-01");

    session.updateTasks([]);
    await session.flush();
    expect(repository.save).not.toHaveBeenCalled();

    const recoveredTask = createTask({
      id: "recovered-task",
      title: "Recovered Task",
    });
    session.updateTasks([recoveredTask]);
    await session.flush();

    expect(repository.save).toHaveBeenCalledWith("2024-01-01", [recoveredTask]);

    consoleSpy.mockRestore();
  });
});
