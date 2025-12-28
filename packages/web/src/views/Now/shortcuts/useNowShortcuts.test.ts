import { act } from "react";
import { useNavigate } from "react-router-dom";
import { renderHook } from "@web/__tests__/__mocks__/mock.render";
import { Task } from "@web/common/types/task.types";
import {
  keyPressed$,
  pressKey,
} from "@web/common/utils/dom/event-emitter.util";
import { useNowShortcuts } from "@web/views/Now/shortcuts/useNowShortcuts";

// Mock react-router-dom
jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));

// Mock the shortcut utility
jest.mock("@web/views/Day/util/day.shortcut.util", () => ({
  isEditable: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockIsEditable = jest.requireMock(
  "@web/views/Day/util/day.shortcut.util",
).isEditable;

describe("useNowShortcuts", () => {
  const mockTask1: Task = {
    id: "task-1",
    title: "Task 1",
    status: "todo",
    order: 0,
    createdAt: "2024-01-01T10:00:00Z",
  };

  const mockTask2: Task = {
    id: "task-2",
    title: "Task 2",
    status: "todo",
    order: 1,
    createdAt: "2024-01-01T11:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    keyPressed$.next(null);
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    mockIsEditable.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("global navigation shortcuts", () => {
    it("should navigate to Day when 'Escape' is pressed", async () => {
      await act(() => renderHook(useNowShortcuts));

      pressKey("Escape");

      expect(mockNavigate).toHaveBeenCalledWith("/day");
    });

    it("should not handle unknown keys", async () => {
      await act(() => renderHook(useNowShortcuts));

      pressKey("x");

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("task navigation shortcuts", () => {
    const defaultProps = {
      focusedTask: mockTask1,
      availableTasks: [mockTask1, mockTask2],
      onPreviousTask: jest.fn(),
      onNextTask: jest.fn(),
      onCompleteTask: jest.fn(),
    };

    it("should call onPreviousTask when 'j' is pressed", () => {
      renderHook(() => useNowShortcuts(defaultProps));

      pressKey("j");

      expect(defaultProps.onPreviousTask).toHaveBeenCalled();
    });

    it("should call onNextTask when 'k' is pressed", () => {
      renderHook(() => useNowShortcuts(defaultProps));

      pressKey("k");

      expect(defaultProps.onNextTask).toHaveBeenCalled();
    });

    it("should handle case-insensitive key matching for 'j'", () => {
      renderHook(() => useNowShortcuts(defaultProps));

      pressKey("J");

      expect(defaultProps.onPreviousTask).toHaveBeenCalled();
    });

    it("should handle case-insensitive key matching for 'k'", () => {
      renderHook(() => useNowShortcuts(defaultProps));

      pressKey("K");

      expect(defaultProps.onNextTask).toHaveBeenCalled();
    });

    it("should not handle task shortcuts when there is no focused task", () => {
      const props = { ...defaultProps, focusedTask: null };

      renderHook(() => useNowShortcuts(props));

      pressKey("j");

      expect(props.onPreviousTask).not.toHaveBeenCalled();
    });

    it("should not handle task shortcuts when there are no available tasks", () => {
      const props = { ...defaultProps, availableTasks: [] };

      renderHook(() => useNowShortcuts(props));

      pressKey("k");

      expect(props.onNextTask).not.toHaveBeenCalled();
    });

    it("should handle task shortcuts when focusedTask exists and availableTasks has items", () => {
      renderHook(() => useNowShortcuts(defaultProps));

      pressKey("j");

      expect(defaultProps.onPreviousTask).toHaveBeenCalled();
    });

    it("should call onCompleteTask when 'Enter' is pressed", () => {
      renderHook(() => useNowShortcuts(defaultProps));

      pressKey("Enter");

      expect(defaultProps.onCompleteTask).toHaveBeenCalled();
    });

    it("should not handle Enter shortcut when there is no focused task", () => {
      const props = { ...defaultProps, focusedTask: null };

      renderHook(() => useNowShortcuts(props));

      pressKey("Enter");

      expect(props.onCompleteTask).not.toHaveBeenCalled();
    });
  });

  describe("editable element handling", () => {
    const defaultProps = {
      focusedTask: mockTask1,
      availableTasks: [mockTask1, mockTask2],
      onPreviousTask: jest.fn(),
      onNextTask: jest.fn(),
      onCompleteTask: jest.fn(),
    };

    it("should not handle shortcuts when typing in input elements", () => {
      renderHook(() => useNowShortcuts(defaultProps));

      mockIsEditable.mockReturnValue(true);

      const input = document.createElement("input");

      document.body.appendChild(input);

      input.focus();

      pressKey("j");

      expect(defaultProps.onPreviousTask).not.toHaveBeenCalled();
    });

    it("should not handle shortcuts when typing in textarea elements", () => {
      renderHook(() => useNowShortcuts(defaultProps));

      mockIsEditable.mockReturnValue(true);

      const textarea = document.createElement("textarea");

      document.body.appendChild(textarea);

      textarea.focus();

      pressKey("k");

      expect(defaultProps.onNextTask).not.toHaveBeenCalled();
    });

    it("should not handle shortcuts when typing in contenteditable elements", () => {
      renderHook(() => useNowShortcuts(defaultProps));

      mockIsEditable.mockReturnValue(true);

      const div = document.createElement("div");

      div.setAttribute("contenteditable", "true");

      document.body.appendChild(div);

      div.focus();

      pressKey("j");

      expect(defaultProps.onPreviousTask).not.toHaveBeenCalled();
    });
  });
});
