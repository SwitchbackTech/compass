import "@testing-library/jest-dom";
import { cleanup, screen, waitFor } from "@testing-library/react";
import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import "@web/__tests__/floating-ui.setup";
import { type ReactNode } from "react";
import { addTasks } from "@web/__tests__/utils/tasks/task.test.util";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

const mockRecipeInit = mock(() => ({}));
const mockSuperTokensInit = mock();

Object.defineProperty(globalThis, "indexedDB", {
  configurable: true,
  value: indexedDB,
});
Object.defineProperty(globalThis, "IDBKeyRange", {
  configurable: true,
  value: IDBKeyRange,
});

const { prepareEmptyStorageForTests } =
  require("@web/__tests__/utils/storage/indexeddb.test.util") as typeof import("@web/__tests__/utils/storage/indexeddb.test.util");

mock.module("supertokens-web-js", () => ({
  default: {
    init: mockSuperTokensInit,
  },
}));

mock.module("supertokens-web-js/recipe/emailpassword", () => ({
  default: {
    init: mockRecipeInit,
  },
}));

mock.module("supertokens-web-js/recipe/emailverification", () => ({
  default: {
    init: mockRecipeInit,
  },
}));

mock.module("supertokens-web-js/recipe/thirdparty", () => ({
  default: {
    init: mockRecipeInit,
  },
}));

mock.module("supertokens-web-js/recipe/session", () => ({
  attemptRefreshingSession: mock(),
  default: {
    attemptRefreshingSession: mock(),
    doesSessionExist: mock().mockResolvedValue(true),
    getAccessToken: mock().mockResolvedValue("mock-access-token"),
    getAccessTokenPayloadSecurely: mock().mockResolvedValue({}),
    getInvalidClaimsFromResponse: mock().mockResolvedValue([]),
    getUserId: mock().mockResolvedValue("mock-user-id"),
    init: mockRecipeInit,
    signOut: mock().mockResolvedValue(undefined),
    validateClaims: mock().mockResolvedValue([]),
  },
}));

mock.module("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }: { children: ReactNode }) => children,
  useGoogleLogin: () => mock(),
}));

const { renderWithDayProvidersAsync } =
  require("../../util/day.test-util") as typeof import("../../util/day.test-util");
const { TaskList } =
  require("../TaskList/TaskList") as typeof import("../TaskList/TaskList");

// Mock console.log to test the delete action
const mockConsoleLog = spyOn(console, "log").mockImplementation(() => {});

describe("TaskContextMenu", () => {
  beforeEach(async () => {
    mockConsoleLog.mockClear();
    await prepareEmptyStorageForTests();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  afterEach(() => {
    cleanup();
  });

  it("should open context menu on right-click on a task", async () => {
    const { user } = await renderWithDayProvidersAsync(<TaskList />);

    await addTasks(user, ["Test task"]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test task")).toBeInTheDocument();
    });

    // Right-click on the task
    const taskElement = screen.getByDisplayValue("Test task").closest(".group");
    expect(taskElement).toBeInTheDocument();

    await user.pointer({ target: taskElement!, keys: "[MouseRight]" });

    // Check that context menu appears
    await waitFor(async () => {
      expect(await screen.findByText("Delete Task")).toBeInTheDocument();
    });
  }, 15000);

  it("should show Delete Task menu item when menu is open", async () => {
    const { user } = await renderWithDayProvidersAsync(<TaskList />);

    await addTasks(user, ["Test task"]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test task")).toBeInTheDocument();
    });

    // Right-click on the task
    const taskElement = screen.getByDisplayValue("Test task").closest(".group");
    await user.pointer({ target: taskElement!, keys: "[MouseRight]" });

    // Check that Delete Task menu item is visible
    await waitFor(async () => {
      const deleteMenuItem = await screen.findByText("Delete Task");
      expect(deleteMenuItem).toBeInTheDocument();
      expect(deleteMenuItem.closest("button")).toHaveClass("cursor-pointer");
    });
  }, 15000);

  it("should remove task from list when Delete Task is clicked", async () => {
    const { user } = await renderWithDayProvidersAsync(<TaskList />);

    await addTasks(user, ["Task to delete"]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Task to delete")).toBeInTheDocument();
    });

    // Right-click on the task
    const taskElement = screen
      .getByDisplayValue("Task to delete")
      .closest(".group");
    await user.pointer({ target: taskElement!, keys: "[MouseRight]" });

    // Click Delete Task
    await waitFor(async () => {
      expect(await screen.findByText("Delete Task")).toBeInTheDocument();
    });

    const deleteButton = await screen.findByText("Delete Task");
    await user.click(deleteButton);

    // Check that task is removed from the list
    await waitFor(() => {
      expect(screen.queryByText("Task to delete")).not.toBeInTheDocument();
    });
  }, 15000);

  it("should close menu when clicking outside", async () => {
    const { user } = await renderWithDayProvidersAsync(<TaskList />);

    await addTasks(user, ["Test task"]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test task")).toBeInTheDocument();
    });

    // Right-click on the task
    const taskElement = screen.getByDisplayValue("Test task").closest(".group");
    await user.pointer({ target: taskElement!, keys: "[MouseRight]" });

    // Check that menu is open
    await waitFor(async () => {
      expect(await screen.findByText("Delete Task")).toBeInTheDocument();
    });

    // Click outside the menu (on the heading button)
    const headingButton = screen.getByRole("button", { name: /select view/i });
    await user.click(headingButton);

    // Check that menu is closed
    await waitFor(() => {
      expect(screen.queryByText("Delete Task")).not.toBeInTheDocument();
    });
  }, 15000);

  it("should close menu when pressing Escape key", async () => {
    const { user } = await renderWithDayProvidersAsync(<TaskList />);

    await addTasks(user, ["Test task"]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test task")).toBeInTheDocument();
    });

    // Right-click on the task
    const taskElement = screen.getByDisplayValue("Test task").closest(".group");
    await user.pointer({ target: taskElement!, keys: "[MouseRight]" });

    // Check that menu is open
    await waitFor(async () => {
      expect(await screen.findByText("Delete Task")).toBeInTheDocument();
    });

    // Press Escape key
    await user.keyboard("{Escape}");

    // Check that menu is closed
    await waitFor(() => {
      expect(screen.queryByText("Delete Task")).not.toBeInTheDocument();
    });
  }, 15000);

  it("should not open context menu when right-clicking on add task button", async () => {
    const { user } = await renderWithDayProvidersAsync(<TaskList />);

    // Right-click on the add task button
    const addButton = await screen.findByText("Create task");
    await user.pointer({ target: addButton, keys: "[MouseRight]" });

    // Check that no context menu appears
    expect(screen.queryByText("Delete Task")).not.toBeInTheDocument();
  }, 15000);

  it("should work with multiple tasks", async () => {
    const { user } = await renderWithDayProvidersAsync(<TaskList />);

    await addTasks(user, ["First task", "Second task"]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Second task")).toBeInTheDocument();
    });

    // Right-click on the first task
    const firstTaskElement = screen
      .getByDisplayValue("First task")
      .closest(".group");
    await user.pointer({ target: firstTaskElement!, keys: "[MouseRight]" });

    // Check that menu appears and shows correct task
    await waitFor(async () => {
      expect(await screen.findByText("Delete Task")).toBeInTheDocument();
    });

    // Click Delete Task
    const deleteButton = await screen.findByText("Delete Task");
    await user.click(deleteButton);

    // Check that only the first task is deleted
    await waitFor(() => {
      expect(screen.queryByText("First task")).not.toBeInTheDocument();
      expect(screen.getByDisplayValue("Second task")).toBeInTheDocument();
    });
  }, 15000);
});

afterAll(() => {
  mock.restore();
});
