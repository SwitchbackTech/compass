import { useNavigate } from "react-router-dom";
import { renderHook } from "@testing-library/react";
import { Task } from "@web/views/Day/task.types";
import { useNowShortcuts } from "./useNowShortcuts";

// Mock react-router-dom
jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));

// Mock the shortcut utility
jest.mock("@web/views/Day/util/shortcut.util", () => ({
  isEditable: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockIsEditable = jest.requireMock(
  "@web/views/Day/util/shortcut.util",
).isEditable;

// Mock addEventListener and removeEventListener
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

Object.defineProperty(window, "addEventListener", {
  value: mockAddEventListener,
  writable: true,
});

Object.defineProperty(window, "removeEventListener", {
  value: mockRemoveEventListener,
  writable: true,
});

describe("useNowShortcuts", () => {
  const mockTask1: Task = {
    id: "task-1",
    title: "Task 1",
    status: "todo",
    createdAt: "2024-01-01T10:00:00Z",
  };

  const mockTask2: Task = {
    id: "task-2",
    title: "Task 2",
    status: "todo",
    createdAt: "2024-01-01T11:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    mockIsEditable.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("event listener management", () => {
    it("should add and remove event listeners on mount and unmount", () => {
      const { unmount } = renderHook(() => useNowShortcuts());

      expect(mockAddEventListener).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );
    });
  });

  describe("global navigation shortcuts", () => {
    it("should navigate to Now when '1' is pressed", () => {
      renderHook(() => useNowShortcuts());

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "1",
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/now");
    });

    it("should navigate to Today when '2' is pressed", () => {
      renderHook(() => useNowShortcuts());

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "2",
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/day");
    });

    it("should navigate to Week (root) when '3' is pressed", () => {
      renderHook(() => useNowShortcuts());

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "3",
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("should navigate to Day when 'Escape' is pressed", () => {
      renderHook(() => useNowShortcuts());

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "Escape",
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/day");
    });

    it("should not handle unknown keys", () => {
      renderHook(() => useNowShortcuts());

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "x",
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
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

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "j",
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(props.onPreviousTask).toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("should call onNextTask when 'k' is pressed", () => {
      const props = { ...defaultProps };
      renderHook(() => useNowShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "k",
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(props.onNextTask).toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("should handle case-insensitive key matching for 'j'", () => {
      const props = { ...defaultProps };
      renderHook(() => useNowShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "J",
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(props.onPreviousTask).toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("should handle case-insensitive key matching for 'k'", () => {
      const props = { ...defaultProps };
      renderHook(() => useNowShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "K",
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(props.onNextTask).toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("should not handle task shortcuts when there is no focused task", () => {
      const props = {
        ...defaultProps,
        focusedTask: null,
      };
      renderHook(() => useNowShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "j",
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(props.onPreviousTask).not.toHaveBeenCalled();
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    it("should not handle task shortcuts when there are no available tasks", () => {
      const props = {
        ...defaultProps,
        availableTasks: [],
      };
      renderHook(() => useNowShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "k",
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(props.onNextTask).not.toHaveBeenCalled();
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    it("should handle task shortcuts when focusedTask exists and availableTasks has items", () => {
      const props = { ...defaultProps };
      renderHook(() => useNowShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "j",
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(props.onPreviousTask).toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("should call onCompleteTask when 'Enter' is pressed", () => {
      const props = { ...defaultProps };
      renderHook(() => useNowShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "Enter",
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(props.onCompleteTask).toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("should not handle Enter shortcut when there is no focused task", () => {
      const props = {
        ...defaultProps,
        focusedTask: null,
      };
      renderHook(() => useNowShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "Enter",
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(props.onCompleteTask).not.toHaveBeenCalled();
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
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

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const input = document.createElement("input");
      const mockEvent = {
        key: "j",
        preventDefault: jest.fn(),
        target: input,
      };

      keydownHandler(mockEvent);

      expect(props.onPreviousTask).not.toHaveBeenCalled();
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    it("should not handle shortcuts when typing in textarea elements", () => {
      const props = { ...defaultProps };
      renderHook(() => useNowShortcuts(props));

      mockIsEditable.mockReturnValue(true);

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const textarea = document.createElement("textarea");
      const mockEvent = {
        key: "k",
        preventDefault: jest.fn(),
        target: textarea,
      };

      keydownHandler(mockEvent);

      expect(props.onNextTask).not.toHaveBeenCalled();
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    it("should not handle shortcuts when typing in contenteditable elements", () => {
      const props = { ...defaultProps };
      renderHook(() => useNowShortcuts(props));

      mockIsEditable.mockReturnValue(true);

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const div = document.createElement("div");
      div.setAttribute("contenteditable", "true");
      const mockEvent = {
        key: "j",
        preventDefault: jest.fn(),
        target: div,
      };

      keydownHandler(mockEvent);

      expect(props.onPreviousTask).not.toHaveBeenCalled();
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });
  });
});
