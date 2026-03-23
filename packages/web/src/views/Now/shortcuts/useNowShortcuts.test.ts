import { useNavigate } from "react-router-dom";
import { renderHook } from "@web/__tests__/__mocks__/mock.render";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { useNowShortcuts } from "@web/views/Now/shortcuts/useNowShortcuts";

// Mock react-router-dom
jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));

const mockNavigate = jest.fn();

describe("useNowShortcuts", () => {
  const mockTask1 = createMockTask();
  const mockTask2 = createMockTask();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
  });

  afterEach(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    jest.clearAllMocks();
  });

  describe("global navigation shortcuts", () => {
    it("should navigate to Day when 'Escape' is pressed", async () => {
      renderHook(useNowShortcuts);

      pressKey("Escape");

      expect(mockNavigate).toHaveBeenCalledWith("/day");
    });

    it("should not handle unknown keys", async () => {
      renderHook(useNowShortcuts);

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
      onEditDescription: jest.fn(),
      onEditTitle: jest.fn(),
      onSaveDescription: jest.fn(),
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

    it("emits the description focus event when 'e' then 'd' is pressed", () => {
      renderHook(() => useNowShortcuts(defaultProps));

      pressKey("e");
      pressKey("d");

      expect(defaultProps.onEditDescription).toHaveBeenCalledTimes(1);
    });

    it("emits the title focus event when 'e' then 't' is pressed", () => {
      renderHook(() => useNowShortcuts(defaultProps));

      pressKey("e");
      pressKey("t");

      expect(defaultProps.onEditTitle).toHaveBeenCalledTimes(1);
    });

    it("does not emit the description focus event when only 'd' is pressed", () => {
      renderHook(() => useNowShortcuts(defaultProps));

      pressKey("d");

      expect(defaultProps.onEditDescription).not.toHaveBeenCalled();
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
      onEditDescription: jest.fn(),
      onEditTitle: jest.fn(),
      onSaveDescription: jest.fn(),
    };

    it("should not handle shortcuts when typing in input elements", () => {
      renderHook(() => useNowShortcuts(defaultProps));

      const input = document.createElement("input");

      document.body.appendChild(input);
      try {
        input.focus();

        pressKey("j", {}, input);

        expect(defaultProps.onPreviousTask).not.toHaveBeenCalled();
      } finally {
        input.remove();
      }
    });

    it("does not fire edit sequences when there is no focused task", () => {
      const props = { ...defaultProps, focusedTask: null };

      renderHook(() => useNowShortcuts(props));

      pressKey("e");
      pressKey("d");
      pressKey("e");
      pressKey("t");

      expect(props.onEditDescription).not.toHaveBeenCalled();
      expect(props.onEditTitle).not.toHaveBeenCalled();
    });

    it("does not fire edit sequences when typing in editable inputs", () => {
      renderHook(() => useNowShortcuts(defaultProps));

      const input = document.createElement("input");

      document.body.appendChild(input);
      try {
        input.focus();

        pressKey("e", {}, input);
        pressKey("d", {}, input);
        pressKey("e", {}, input);
        pressKey("t", {}, input);

        expect(defaultProps.onEditDescription).not.toHaveBeenCalled();
        expect(defaultProps.onEditTitle).not.toHaveBeenCalled();
      } finally {
        input.remove();
      }
    });

    it("should not handle shortcuts when typing in textarea elements", () => {
      renderHook(() => useNowShortcuts(defaultProps));

      const textarea = document.createElement("textarea");

      document.body.appendChild(textarea);
      try {
        textarea.focus();

        pressKey("k", {}, textarea);

        expect(defaultProps.onNextTask).not.toHaveBeenCalled();
      } finally {
        textarea.remove();
      }
    });

    it("should not handle shortcuts when typing in contenteditable elements", () => {
      renderHook(() => useNowShortcuts(defaultProps));

      const div = document.createElement("div");

      div.setAttribute("contenteditable", "true");
      Object.defineProperty(div, "isContentEditable", { value: true });

      document.body.appendChild(div);
      try {
        div.focus();

        pressKey("j", {}, div);

        expect(defaultProps.onPreviousTask).not.toHaveBeenCalled();
      } finally {
        div.remove();
      }
    });
  });
});
