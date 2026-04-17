import "@testing-library/jest-dom";
import "fake-indexeddb/auto";
import { screen, within } from "@testing-library/react";
import { type ReactNode } from "react";
import { getModifierKeyTestId } from "@web/common/utils/shortcut/shortcut.util";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { afterAll } from "bun:test";

const mockRecipeInit = mock(() => ({}));
const mockSuperTokensInit = mock();
const mockTaskRepository = {
  delete: mock().mockResolvedValue(undefined),
  get: mock().mockResolvedValue([]),
  move: mock().mockResolvedValue(undefined),
  reorder: mock().mockResolvedValue(undefined),
  save: mock().mockResolvedValue(undefined),
};
const mockTasksState = {
  deleteTask: mock(),
  focusOnInput: mock(),
  isLoadingTasks: false,
  migrateTask: mock(),
  restoreTask: mock(),
  selectedTaskIndex: -1,
  setEditingTaskId: mock(),
  setEditingTitle: mock(),
  setSelectedTaskIndex: mock(),
  tasks: [],
  undoToastId: null,
};

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

mock.module("@web/views/Day/hooks/events/useDayEvents", () => ({
  useDayEvents: mock(),
}));

mock.module("@web/views/Day/hooks/tasks/useTasks", () => ({
  useTasks: () => mockTasksState,
}));

mock.module("@web/views/Day/components/TaskList/TaskList", () => ({
  TaskList: () => (
    <section aria-label="daily-tasks">
      <button type="button">Create task</button>
    </section>
  ),
}));

mock.module("@web/common/storage/adapter/adapter", () => ({
  ensureStorageReady: mock().mockResolvedValue(undefined),
  getStorageAdapter: () => mockTaskRepository,
  initializeStorage: mock().mockResolvedValue(undefined),
  isStorageReady: () => true,
  resetStorage: mock(),
  resetStorageAsync: mock().mockResolvedValue(undefined),
}));

mock.module("@web/common/repositories/task/task.repository.util", () => ({
  getTaskRepository: () => mockTaskRepository,
}));

Object.defineProperty(window, "indexedDB", {
  configurable: true,
  value: indexedDB,
});
Object.defineProperty(window, "IDBKeyRange", {
  configurable: true,
  value: IDBKeyRange,
});

const { prepareEmptyStorageForTests } =
  require("@web/__tests__/utils/storage/indexeddb.test.util") as typeof import("@web/__tests__/utils/storage/indexeddb.test.util");
const { waitForTaskListReady } =
  require("@web/__tests__/utils/tasks/task.test.util") as typeof import("@web/__tests__/utils/tasks/task.test.util");
const { renderWithDayProvidersAsync } =
  require("@web/views/Day/util/day.test-util") as typeof import("@web/views/Day/util/day.test-util");
const { DayViewContent } =
  require("@web/views/Day/view/DayViewContent") as typeof import("@web/views/Day/view/DayViewContent");

// Mock matchMedia to simulate wide screen (sidebar visible)
const mockMatchMedia = (matches: boolean) => ({
  matches,
  media: "",
  onchange: null,
  addListener: mock(),
  removeListener: mock(),
  addEventListener: mock(),
  removeEventListener: mock(),
  dispatchEvent: mock(),
});

describe("DayView", () => {
  const originalMatchMedia = window.matchMedia;
  const originalInnerWidth = window.innerWidth;

  beforeEach(async () => {
    // Simulate wide screen so sidebar is visible
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1400,
    });
    window.matchMedia = mock().mockReturnValue(mockMatchMedia(true));
    mockRecipeInit.mockClear();
    mockSuperTokensInit.mockClear();
    mockTaskRepository.delete.mockClear();
    mockTaskRepository.get.mockClear();
    mockTaskRepository.get.mockResolvedValue([]);
    mockTaskRepository.move.mockClear();
    mockTaskRepository.reorder.mockClear();
    mockTaskRepository.save.mockClear();
    mockTasksState.deleteTask.mockClear();
    mockTasksState.focusOnInput.mockClear();
    mockTasksState.migrateTask.mockClear();
    mockTasksState.restoreTask.mockClear();
    mockTasksState.setEditingTaskId.mockClear();
    mockTasksState.setEditingTitle.mockClear();
    mockTasksState.setSelectedTaskIndex.mockClear();
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: indexedDB,
    });
    await prepareEmptyStorageForTests();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it("should render TaskList component", async () => {
    await renderWithDayProvidersAsync(<DayViewContent />);
    await waitForTaskListReady();

    const taskpanel = await screen.findByRole("region", {
      name: "daily-tasks",
    });

    expect(within(taskpanel).getByText("Create task")).toBeInTheDocument();
  });

  it("should render CalendarAgenda component", async () => {
    await renderWithDayProvidersAsync(<DayViewContent />);
    await waitForTaskListReady();

    expect(await screen.findByTestId("calendar-scroll")).toBeInTheDocument();
  });

  it("should render command palette shortcut", async () => {
    await renderWithDayProvidersAsync(<DayViewContent />);
    await waitForTaskListReady();

    // Check that CMD+K shortcut is displayed in the shortcuts overlay
    expect(await screen.findByText("Global")).toBeInTheDocument();
    expect(screen.getByTestId(getModifierKeyTestId())).toBeInTheDocument();
    expect(screen.getAllByTestId("k-icon").length).toBeGreaterThan(1);
    expect(screen.getByText("Command Palette")).toBeInTheDocument();
  });
});

afterAll(() => {
  mock.restore();
});
