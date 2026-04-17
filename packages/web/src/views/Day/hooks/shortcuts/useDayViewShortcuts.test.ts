import { HotkeyManager, resolveModifier } from "@tanstack/react-hotkeys";
import userEvent from "@testing-library/user-event";
import { type ReactNode } from "react";
import {
  mockLinuxUserAgent,
  mockMacOSUserAgent,
  mockWindowsUserAgent,
} from "@web/__tests__/__mocks__/mock.setup";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";

const getFocusedTaskId = mock();
const isFocusedOnTaskCheckbox = mock();
const isFocusedWithinTask = mock();
const mockRecipeInit = mock(() => ({}));
const mockSuperTokensInit = mock();
const toast = {
  dismiss: mock(),
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

mock.module("@web/views/Day/util/day.shortcut.util", () => ({
  getFocusedTaskId,
  isFocusedOnTaskCheckbox,
  isFocusedWithinTask,
}));

mock.module("react-toastify", () => ({
  ToastContainer: () => null,
  toast,
}));

const { useDayViewShortcuts } =
  require("@web/views/Day/hooks/shortcuts/useDayViewShortcuts") as typeof import("@web/views/Day/hooks/shortcuts/useDayViewShortcuts");
const { renderHook } =
  require("@web/__tests__/__mocks__/mock.render") as typeof import("@web/__tests__/__mocks__/mock.render");

describe.each([
  { os: "Windows", mockFn: mockWindowsUserAgent },
  { os: "Linux", mockFn: mockLinuxUserAgent },
  { os: "MacOS", mockFn: mockMacOSUserAgent },
])("useDayViewShortcuts - $os", ({ mockFn }) => {
  let userAgentMock: ReturnType<typeof mockFn> | undefined;

  beforeAll(() => {
    userAgentMock = mockFn();
  });
  afterAll(() => userAgentMock?.mockRestore());

  beforeEach(() => {
    getFocusedTaskId.mockClear();
    isFocusedOnTaskCheckbox.mockClear();
    isFocusedWithinTask.mockClear();
    mockRecipeInit.mockClear();
    mockSuperTokensInit.mockClear();
    toast.dismiss.mockClear();
    for (const value of Object.values(defaultConfig)) {
      if (
        typeof value === "function" &&
        "mockClear" in value &&
        typeof value.mockClear === "function"
      ) {
        value.mockClear();
      }
    }
    HotkeyManager.resetInstance();

    // Set default mock implementations
    isFocusedOnTaskCheckbox.mockReturnValue(false);
    isFocusedWithinTask.mockReturnValue(false);
    getFocusedTaskId.mockReturnValue(null);
  });

  afterEach(() => {
    getFocusedTaskId.mockClear();
    isFocusedOnTaskCheckbox.mockClear();
    isFocusedWithinTask.mockClear();
    toast.dismiss.mockClear();
  });

  const pressModifierShortcut = (
    key: string,
    keyOptions: KeyboardEventInit = {},
    target: Element | Node | Window | Document = document,
  ) => {
    const modifierProps =
      resolveModifier("Mod") === "Meta" ? { metaKey: true } : { ctrlKey: true };

    pressKey(
      key,
      {
        keyDownInit: { ...modifierProps, ...keyOptions },
        keyUpInit: { ...modifierProps, ...keyOptions },
      },
      target,
    );
  };

  const pressMigrationShortcut = (
    key: string,
    keyOptions: KeyboardEventInit = {},
    target: Element | Node | Window | Document = document,
  ) => {
    pressKey(
      key,
      {
        keyDownInit: { ctrlKey: true, metaKey: true, ...keyOptions },
        keyUpInit: { ctrlKey: true, metaKey: true, ...keyOptions },
      },
      target,
    );
  };

  const defaultConfig = {
    onAddTask: mock(),
    onEditTask: mock(),
    onCompleteTask: mock(),
    onDeleteTask: mock(),
    onEscape: mock(),
    onFocusTasks: mock(),
    isEditingTask: false,
    hasFocusedTask: false,
  };

  it("should call onFocusTasks when 'u' is pressed", async () => {
    const config = { ...defaultConfig };
    renderHook(() => useDayViewShortcuts(config));

    pressKey("u");

    expect(config.onFocusTasks).toHaveBeenCalled();
  });

  it("should call onAddTask when 'c' is pressed", async () => {
    const config = { ...defaultConfig };
    renderHook(() => useDayViewShortcuts(config));

    pressKey("c");

    expect(config.onAddTask).toHaveBeenCalled();
  });

  it("should call onEditTask when 'e' is pressed", async () => {
    const config = { ...defaultConfig };
    renderHook(() => useDayViewShortcuts(config));

    pressKey("e");

    expect(config.onEditTask).toHaveBeenCalled();
  });

  it("should call onEscape when 'Escape' is pressed", async () => {
    const config = { ...defaultConfig };
    renderHook(() => useDayViewShortcuts(config));

    pressKey("Escape");

    expect(config.onEscape).toHaveBeenCalled();
  });

  it("should call onCompleteTask when Enter is pressed on a focused task", async () => {
    const config = { ...defaultConfig, hasFocusedTask: true };
    renderHook(() => useDayViewShortcuts(config));

    // Mock document.activeElement to not be a task button
    Object.defineProperty(document, "activeElement", {
      value: document.createElement("div"),
      writable: true,
    });

    pressKey("Enter");

    expect(config.onCompleteTask).toHaveBeenCalled();
  });

  it("should not call onCompleteTask when Enter is pressed on a task button", async () => {
    const config = { ...defaultConfig, hasFocusedTask: true };
    renderHook(() => useDayViewShortcuts(config));

    // Mock document.activeElement to be a task button
    const taskButton = document.createElement("button");
    taskButton.setAttribute("role", "checkbox");
    taskButton.setAttribute("data-task-id", "test-task");
    Object.defineProperty(document, "activeElement", {
      value: taskButton,
      writable: true,
    });

    pressKey("Enter");

    expect(config.onCompleteTask).not.toHaveBeenCalled();
  });

  it("should not call onCompleteTask when Enter is pressed while editing", async () => {
    const config = {
      ...defaultConfig,
      hasFocusedTask: true,
      isEditingTask: true,
    };
    renderHook(() => useDayViewShortcuts(config));

    pressKey("Enter");

    expect(config.onCompleteTask).not.toHaveBeenCalled();
  });

  it("should not call onCompleteTask when Enter is pressed without focused task", async () => {
    const config = { ...defaultConfig, hasFocusedTask: false };
    renderHook(() => useDayViewShortcuts(config));

    pressKey("Enter");

    expect(config.onCompleteTask).not.toHaveBeenCalled();
  });

  it("should not handle shortcuts when typing in input elements", async () => {
    const config = { ...defaultConfig };
    renderHook(() => useDayViewShortcuts(config));

    const input = document.createElement("input");

    document.body.appendChild(input);

    input.focus();

    pressKey("u", {}, input);

    expect(config.onFocusTasks).not.toHaveBeenCalled();
  });

  it("should not handle shortcuts when typing in textarea elements", async () => {
    const config = { ...defaultConfig };
    renderHook(() => useDayViewShortcuts(config));

    const textarea = document.createElement("textarea");

    document.body.appendChild(textarea);

    textarea.focus();

    pressKey("c", {}, textarea);

    expect(config.onAddTask).not.toHaveBeenCalled();
  });

  it("should not handle shortcuts when typing in contenteditable elements", async () => {
    const config = { ...defaultConfig };
    renderHook(() => useDayViewShortcuts(config));

    const div = document.createElement("div");

    div.setAttribute("contenteditable", "true");
    Object.defineProperty(div, "isContentEditable", { value: true });

    document.body.appendChild(div);

    div.focus();

    pressKey("e", {}, div);

    expect(config.onEditTask).not.toHaveBeenCalled();
  });

  it("should still handle Escape when typing in input elements", async () => {
    const config = { ...defaultConfig };

    renderHook(() => useDayViewShortcuts(config));

    const input = document.createElement("input");

    document.body.appendChild(input);

    input.focus();

    pressKey("Escape");

    expect(config.onEscape).toHaveBeenCalled();
  });

  it("should handle case insensitive key presses", async () => {
    const config = { ...defaultConfig };

    renderHook(() => useDayViewShortcuts(config));

    pressKey("U");

    expect(config.onFocusTasks).toHaveBeenCalled();
  });

  it("should call onDeleteTask when Delete is pressed on a focused checkbox", async () => {
    const config = { ...defaultConfig, hasFocusedTask: true };

    renderHook(() => useDayViewShortcuts(config));

    isFocusedOnTaskCheckbox.mockReturnValue(true);

    // Mock document.activeElement to be a task button
    const taskButton = document.createElement("button");
    taskButton.setAttribute("role", "checkbox");
    taskButton.setAttribute("data-task-id", "test-task");
    Object.defineProperty(document, "activeElement", {
      value: taskButton,
      writable: true,
    });

    pressKey("Delete");

    expect(config.onDeleteTask).toHaveBeenCalled();
  });

  it("should NOT call onDeleteTask when Delete is pressed on an input field", async () => {
    const config = { ...defaultConfig, hasFocusedTask: true };
    renderHook(() => useDayViewShortcuts(config));

    const input = document.createElement("input");

    document.body.appendChild(input);

    input.focus();

    pressKey("Delete", {}, input);

    expect(config.onDeleteTask).not.toHaveBeenCalled();
  });

  it("should NOT call onDeleteTask when no task is focused", async () => {
    const config = { ...defaultConfig, hasFocusedTask: false };

    renderHook(() => useDayViewShortcuts(config));

    pressKey("Delete");

    expect(config.onDeleteTask).not.toHaveBeenCalled();
  });

  describe("migration shortcuts", () => {
    it("should call onMigrateTask when Ctrl+Meta+ArrowRight is pressed within a task", async () => {
      const onMigrateTask = mock();
      const config = { ...defaultConfig, onMigrateTask };

      renderHook(() => useDayViewShortcuts(config));

      // Mock utility functions to return task-focused state
      isFocusedWithinTask.mockReturnValue(true);
      getFocusedTaskId.mockReturnValue("task-123");

      pressMigrationShortcut("ArrowRight");

      expect(onMigrateTask).toHaveBeenCalledWith("task-123", "forward");
    });

    it("should call onMigrateTask when Ctrl+Meta+ArrowLeft is pressed within a task", async () => {
      const onMigrateTask = mock();
      const config = { ...defaultConfig, onMigrateTask };

      renderHook(() => useDayViewShortcuts(config));

      // Mock utility functions to return task-focused state
      isFocusedWithinTask.mockReturnValue(true);
      getFocusedTaskId.mockReturnValue("task-456");

      pressMigrationShortcut("ArrowLeft");

      expect(onMigrateTask).toHaveBeenCalledWith("task-456", "backward");
    });

    it("should not trigger migration when only Ctrl is pressed", async () => {
      const onMigrateTask = mock();
      const config = { ...defaultConfig, onMigrateTask };

      renderHook(() => useDayViewShortcuts(config));

      await userEvent.keyboard("{Control>}{ArrowRight}");

      expect(onMigrateTask).not.toHaveBeenCalled();
    });

    it("should not trigger migration when only Meta is pressed", async () => {
      const onMigrateTask = mock();
      const config = { ...defaultConfig, onMigrateTask };

      renderHook(() => useDayViewShortcuts(config));

      await userEvent.keyboard("{Meta>}{ArrowRight}");

      expect(onMigrateTask).not.toHaveBeenCalled();
    });

    it("should trigger migration even when typing in input (special case)", async () => {
      const onMigrateTask = mock();
      const config = { ...defaultConfig, onMigrateTask };

      renderHook(() => useDayViewShortcuts(config));

      // Mock utility functions to return task-focused state
      isFocusedWithinTask.mockReturnValue(true);
      getFocusedTaskId.mockReturnValue("task-789");

      const input = document.createElement("input");

      document.body.appendChild(input);

      input.focus();

      pressMigrationShortcut("ArrowRight", {}, input);

      document.body.removeChild(input);

      expect(onMigrateTask).toHaveBeenCalledWith("task-789", "forward");
    });
  });

  describe("undo shortcuts", () => {
    beforeEach(() => toast.dismiss.mockClear());

    it("should call onRestoreTask when Meta+Z is pressed", async () => {
      const onRestoreTask = mock();
      const undoToastId = "task-toast-123";
      const config = { ...defaultConfig, onRestoreTask, undoToastId };

      renderHook(() => useDayViewShortcuts(config));

      pressModifierShortcut("z");

      expect(onRestoreTask).toHaveBeenCalled();
    });

    it("should dismiss undo toast when Meta+Z is pressed with undoToastId", async () => {
      const onRestoreTask = mock();
      const undoToastId = "undo-toast-123";
      const config = { ...defaultConfig, onRestoreTask, undoToastId };

      renderHook(() => useDayViewShortcuts(config));

      pressModifierShortcut("z");

      expect(onRestoreTask).toHaveBeenCalled();
      expect(toast.dismiss).toHaveBeenCalledWith(undoToastId);
    });

    it("should work with uppercase Z", async () => {
      const onRestoreTask = mock();
      const undoToastId = "task-toast-123";
      const config = { ...defaultConfig, onRestoreTask, undoToastId };

      renderHook(() => useDayViewShortcuts(config));

      pressModifierShortcut("Z", { shiftKey: true });

      expect(onRestoreTask).toHaveBeenCalled();
    });

    it("should not trigger restore when only 'z' is pressed without Meta", async () => {
      const onRestoreTask = mock();
      const config = { ...defaultConfig, onRestoreTask };

      renderHook(() => useDayViewShortcuts(config));

      pressKey("z");

      expect(onRestoreTask).not.toHaveBeenCalled();
    });

    it("should prioritize event undo over task undo when both exist", async () => {
      const onRestoreTask = mock();
      const onRestoreEvent = mock();
      const undoToastId = "task-toast-123";
      const eventUndoToastId = "event-toast-456";
      const config = {
        ...defaultConfig,
        onRestoreTask,
        onRestoreEvent,
        undoToastId,
        eventUndoToastId,
      };

      renderHook(() => useDayViewShortcuts(config));

      pressModifierShortcut("z");

      // Should call event restore, not task restore
      expect(onRestoreEvent).toHaveBeenCalled();
      expect(onRestoreTask).not.toHaveBeenCalled();
      expect(toast.dismiss).toHaveBeenCalledWith(eventUndoToastId);
      expect(toast.dismiss).not.toHaveBeenCalledWith(undoToastId);
    });

    it("should call event restore", async () => {
      const windowsUAMock = mockWindowsUserAgent();
      const onRestoreEvent = mock();
      const eventUndoToastId = "event-toast-789";
      const config = { ...defaultConfig, onRestoreEvent, eventUndoToastId };

      renderHook(() => useDayViewShortcuts(config));

      pressModifierShortcut("z");

      expect(onRestoreEvent).toHaveBeenCalled();
      expect(toast.dismiss).toHaveBeenCalledWith(eventUndoToastId);

      windowsUAMock.mockRestore();
    });

    it("should fall back to task undo if no event undo exists", async () => {
      const onRestoreTask = mock();
      const onRestoreEvent = mock();
      const undoToastId = "task-toast-123";
      const config = {
        ...defaultConfig,
        onRestoreTask,
        onRestoreEvent,
        undoToastId,
      };

      renderHook(() => useDayViewShortcuts(config));

      pressModifierShortcut("z");

      // Should call task restore since no event undo exists
      expect(onRestoreTask).toHaveBeenCalled();
      expect(onRestoreEvent).not.toHaveBeenCalled();
      expect(toast.dismiss).toHaveBeenCalledWith(undoToastId);
    });
  });
});

afterAll(() => {
  mock.restore();
});
