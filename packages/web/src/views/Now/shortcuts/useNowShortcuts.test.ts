import { act } from "react";
import { useNavigate } from "react-router-dom";
import { fireEvent } from "@testing-library/react";
import { renderHook } from "@web/__tests__/__mocks__/mock.render";
import { Task } from "@web/common/types/task.types";
import { keyPressed } from "@web/common/utils/dom-events/event-emitter.util";
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
    keyPressed.next(null);
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    mockIsEditable.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("global navigation shortcuts", () => {
    it("should navigate to Day when 'Escape' is pressed", async () => {
      await act(() => renderHook(useNowShortcuts));

      fireEvent.keyDown(window, { key: "Escape" });
      // Escape is useKeyDownEvent

      expect(mockNavigate).toHaveBeenCalledWith("/day");
    });

    it("should not handle unknown keys", async () => {
      await act(() => renderHook(useNowShortcuts));

      fireEvent.keyDown(window, { key: "x" });
      fireEvent.keyUp(window, { key: "x" });

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
      const props = { ...defaultProps };
      renderHook(() => useNowShortcuts(props));

      fireEvent.keyDown(window, { key: "j" });
      fireEvent.keyUp(window, { key: "j" });

      expect(props.onPreviousTask).toHaveBeenCalled();
    });

    it("should call onNextTask when 'k' is pressed", () => {
      const props = { ...defaultProps };
      renderHook(() => useNowShortcuts(props));

      fireEvent.keyDown(window, { key: "k" });
      fireEvent.keyUp(window, { key: "k" });

      expect(props.onNextTask).toHaveBeenCalled();
    });

    it("should handle case-insensitive key matching for 'j'", () => {
      const props = { ...defaultProps };
      renderHook(() => useNowShortcuts(props));

      fireEvent.keyDown(window, { key: "J" });
      fireEvent.keyUp(window, { key: "J" });

      expect(props.onPreviousTask).toHaveBeenCalled();
    });

    it("should handle case-insensitive key matching for 'k'", () => {
      const props = { ...defaultProps };
      renderHook(() => useNowShortcuts(props));

      fireEvent.keyDown(window, { key: "K" });
      fireEvent.keyUp(window, { key: "K" });

      expect(props.onNextTask).toHaveBeenCalled();
    });

    it("should not handle task shortcuts when there is no focused task", () => {
      const props = {
        ...defaultProps,
        focusedTask: null,
      };
      renderHook(() => useNowShortcuts(props));

      fireEvent.keyDown(window, { key: "j" });
      fireEvent.keyUp(window, { key: "j" });

      expect(props.onPreviousTask).not.toHaveBeenCalled();
    });

    it("should not handle task shortcuts when there are no available tasks", () => {
      const props = {
        ...defaultProps,
        availableTasks: [],
      };
      renderHook(() => useNowShortcuts(props));

      fireEvent.keyDown(window, { key: "k" });
      fireEvent.keyUp(window, { key: "k" });

      expect(props.onNextTask).not.toHaveBeenCalled();
    });

    it("should handle task shortcuts when focusedTask exists and availableTasks has items", () => {
      const props = { ...defaultProps };
      renderHook(() => useNowShortcuts(props));

      fireEvent.keyDown(window, { key: "j" });
      fireEvent.keyUp(window, { key: "j" });

      expect(props.onPreviousTask).toHaveBeenCalled();
    });

    it("should call onCompleteTask when 'Enter' is pressed", () => {
      const props = { ...defaultProps };
      renderHook(() => useNowShortcuts(props));

      fireEvent.keyDown(window, { key: "Enter" });
      fireEvent.keyUp(window, { key: "Enter" });

      expect(props.onCompleteTask).toHaveBeenCalled();
    });

    it("should not handle Enter shortcut when there is no focused task", () => {
      const props = {
        ...defaultProps,
        focusedTask: null,
      };
      renderHook(() => useNowShortcuts(props));

      fireEvent.keyDown(window, { key: "Enter" });
      fireEvent.keyUp(window, { key: "Enter" });

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
      const props = { ...defaultProps };
      renderHook(() => useNowShortcuts(props));

      mockIsEditable.mockReturnValue(true);

      const input = document.createElement("input");
      fireEvent.keyDown(input, { key: "j" });
      fireEvent.keyUp(input, { key: "j" });

      expect(props.onPreviousTask).not.toHaveBeenCalled();
    });

    it("should not handle shortcuts when typing in textarea elements", () => {
      const props = { ...defaultProps };
      renderHook(() => useNowShortcuts(props));

      mockIsEditable.mockReturnValue(true);

      const textarea = document.createElement("textarea");
      fireEvent.keyDown(textarea, { key: "k" });
      fireEvent.keyUp(textarea, { key: "k" });

      expect(props.onNextTask).not.toHaveBeenCalled();
    });

    it("should not handle shortcuts when typing in contenteditable elements", () => {
      const props = { ...defaultProps };
      renderHook(() => useNowShortcuts(props));

      mockIsEditable.mockReturnValue(true);

      const div = document.createElement("div");
      div.setAttribute("contenteditable", "true");
      fireEvent.keyDown(div, { key: "j" });
      fireEvent.keyUp(div, { key: "j" });

      expect(props.onPreviousTask).not.toHaveBeenCalled();
    });
  });
});
