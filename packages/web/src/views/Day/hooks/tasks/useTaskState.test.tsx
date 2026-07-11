import { renderHook, waitFor } from "@testing-library/react";
import { type Task } from "@web/common/types/task.types";
import { type TaskRepository } from "@web/tasks/repositories/task.repository";
import { useTaskState } from "@web/views/Day/hooks/tasks/useTaskState";
import { afterAll, describe, expect, it, mock } from "bun:test";

const ensureOfflineDataStoreReadyMock = mock(() => Promise.resolve());

// Capture the real module before mocking it below — mock.module replaces it
// process-wide for the rest of the test run (bun mock.module leaks across
// files), so afterAll restores it for every test file that loads after this
// one.
const realOfflineDataStoreRegistry = require("@web/common/storage/offline-data/offline-data.store.registry");

mock.module(
  "@web/common/storage/offline-data/offline-data.store.registry",
  () => ({
    ensureOfflineDataStoreReady: ensureOfflineDataStoreReadyMock,
    getOfflineDataStore: mock(),
    initializeOfflineDataStore: mock().mockResolvedValue(undefined),
    isOfflineDataStoreReady: mock().mockReturnValue(true),
    resetOfflineDataStore: mock(),
    resetOfflineDataStoreAsync: mock().mockResolvedValue(undefined),
  }),
);

afterAll(() => {
  mock.module(
    "@web/common/storage/offline-data/offline-data.store.registry",
    () => realOfflineDataStoreRegistry,
  );
});

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  _id: "task-1",
  title: "Existing task",
  status: "todo",
  order: 0,
  createdAt: "2026-05-13T12:00:00.000Z",
  ...overrides,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
}

describe("useTaskState", () => {
  it("keeps loaded tasks visible while the next date loads", async () => {
    ensureOfflineDataStoreReadyMock.mockResolvedValue(undefined);

    const firstDateTasks = deferred<Task[]>();
    const nextDateTasks = deferred<Task[]>();
    const repository = {
      delete: mock(),
      get: mock((dateKey: string) => {
        if (dateKey === "2026-05-13") return firstDateTasks.promise;
        if (dateKey === "2026-05-14") return nextDateTasks.promise;

        return Promise.resolve([]);
      }),
      move: mock(),
      reorder: mock(),
      save: mock(),
    } satisfies TaskRepository;

    const { result, rerender } = renderHook(
      ({ date }) =>
        useTaskState({
          currentDate: new Date(date),
          taskRepository: repository,
        }),
      { initialProps: { date: "2026-05-13T12:00:00.000Z" } },
    );

    const existingTask = makeTask();

    firstDateTasks.resolve([existingTask]);

    await waitFor(() => {
      expect(result.current.isLoadingTasks).toBe(false);
      expect(result.current.tasks).toEqual([existingTask]);
    });

    rerender({ date: "2026-05-14T12:00:00.000Z" });

    await waitFor(() => {
      expect(result.current.isLoadingTasks).toBe(true);
    });

    expect(result.current.tasks).toEqual([existingTask]);

    const nextTask = makeTask({
      _id: "task-2",
      title: "Next date task",
    });

    nextDateTasks.resolve([nextTask]);

    await waitFor(() => {
      expect(result.current.isLoadingTasks).toBe(false);
      expect(result.current.tasks).toEqual([nextTask]);
    });
  });
});
