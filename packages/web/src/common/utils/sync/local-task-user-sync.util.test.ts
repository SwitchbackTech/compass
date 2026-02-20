import { createTestTask } from "@web/__tests__/utils/repositories/repository.test.factory";
import { prepareEmptyStorageForTests } from "@web/__tests__/utils/storage/indexeddb.test.util";
import { getUserId } from "@web/auth/auth.util";
import { UNAUTHENTICATED_USER } from "@web/common/constants/auth.constants";
import {
  ensureStorageReady,
  getStorageAdapter,
  resetStorage,
} from "@web/common/storage/adapter/adapter";
import { syncLocalTaskUsersToAuthenticatedUser } from "./local-task-user-sync.util";

jest.mock("@web/auth/auth.util");

describe("syncLocalTaskUsersToAuthenticatedUser", () => {
  const mockGetUserId = getUserId as jest.MockedFunction<typeof getUserId>;

  beforeEach(async () => {
    jest.clearAllMocks();
    resetStorage();
    await prepareEmptyStorageForTests();
    await ensureStorageReady();
  });

  afterEach(() => {
    resetStorage();
  });

  it("rewrites unauthenticated users across multiple dates", async () => {
    mockGetUserId.mockResolvedValue("mongo-user-id");
    const adapter = getStorageAdapter();

    await adapter.putTasks("2024-01-01", [
      createTestTask({ _id: "task-1", user: UNAUTHENTICATED_USER }),
      createTestTask({ _id: "task-2", user: "already-authenticated-user" }),
    ]);
    await adapter.putTasks("2024-01-02", [
      createTestTask({ _id: "task-3", user: UNAUTHENTICATED_USER }),
    ]);

    const syncedCount = await syncLocalTaskUsersToAuthenticatedUser();

    expect(syncedCount).toBe(2);
    await expect(adapter.getTasks("2024-01-01")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _id: "task-1", user: "mongo-user-id" }),
        expect.objectContaining({
          _id: "task-2",
          user: "already-authenticated-user",
        }),
      ]),
    );
    await expect(adapter.getTasks("2024-01-02")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _id: "task-3", user: "mongo-user-id" }),
      ]),
    );
  });

  it("returns 0 when there are no tasks", async () => {
    mockGetUserId.mockResolvedValue("mongo-user-id");

    await expect(syncLocalTaskUsersToAuthenticatedUser()).resolves.toBe(0);
  });

  it("returns 0 and does not rewrite when user is unauthenticated", async () => {
    mockGetUserId.mockResolvedValue(UNAUTHENTICATED_USER);
    const adapter = getStorageAdapter();
    await adapter.putTasks("2024-01-01", [
      createTestTask({ _id: "task-1", user: UNAUTHENTICATED_USER }),
    ]);

    const syncedCount = await syncLocalTaskUsersToAuthenticatedUser();

    expect(syncedCount).toBe(0);
    await expect(adapter.getTasks("2024-01-01")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _id: "task-1", user: UNAUTHENTICATED_USER }),
      ]),
    );
  });

  it("returns 0 when all tasks already have authenticated users", async () => {
    mockGetUserId.mockResolvedValue("mongo-user-id");
    const adapter = getStorageAdapter();
    await adapter.putTasks("2024-01-01", [
      createTestTask({ _id: "task-1", user: "already-authenticated-user" }),
    ]);

    await expect(syncLocalTaskUsersToAuthenticatedUser()).resolves.toBe(0);
    await expect(adapter.getTasks("2024-01-01")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          _id: "task-1",
          user: "already-authenticated-user",
        }),
      ]),
    );
  });

  it("throws when user id lookup fails", async () => {
    mockGetUserId.mockRejectedValue(new Error("Failed to resolve user id"));

    await expect(syncLocalTaskUsersToAuthenticatedUser()).rejects.toThrow(
      "Failed to resolve user id",
    );
  });

  it("throws when loading tasks fails", async () => {
    mockGetUserId.mockResolvedValue("mongo-user-id");
    const adapter = getStorageAdapter();
    jest
      .spyOn(adapter, "getAllTasks")
      .mockRejectedValueOnce(new Error("Failed to load tasks"));

    await expect(syncLocalTaskUsersToAuthenticatedUser()).rejects.toThrow(
      "Failed to load tasks",
    );
  });
});
