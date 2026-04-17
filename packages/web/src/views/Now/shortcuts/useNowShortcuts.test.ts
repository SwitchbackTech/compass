import { type ReactNode } from "react";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { afterAll } from "bun:test";

const actualReactRouterDom =
  require("react-router-dom") as typeof import("react-router-dom");
const mockNavigate = mock();
const mockRecipeInit = mock(() => ({}));
const mockSuperTokensInit = mock();
const mockUseNavigate = mock(() => mockNavigate);

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
mock.module("supertokens-web-js/recipe/thirdparty", () => ({
  default: {
    init: mockRecipeInit,
  },
}));
mock.module("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }: { children: ReactNode }) => children,
  useGoogleLogin: () => mock(),
}));
mock.module("react-router-dom", () => ({
  ...actualReactRouterDom,
  useNavigate: mockUseNavigate,
}));

const { renderHook } =
  require("@web/__tests__/__mocks__/mock.render") as typeof import("@web/__tests__/__mocks__/mock.render");
const { useNowShortcuts } =
  require("@web/views/Now/shortcuts/useNowShortcuts") as typeof import("@web/views/Now/shortcuts/useNowShortcuts");

describe("useNowShortcuts", () => {
  const mockTask1 = createMockTask();
  const mockTask2 = createMockTask();

  const createDefaultProps = () => ({
    focusedTask: mockTask1,
    availableTasks: [mockTask1, mockTask2],
    onPreviousTask: mock(),
    onNextTask: mock(),
    onCompleteTask: mock(),
  });

  beforeEach(() => {
    mockNavigate.mockClear();
    mockRecipeInit.mockClear();
    mockSuperTokensInit.mockClear();
    mockUseNavigate.mockClear();
    mockUseNavigate.mockReturnValue(mockNavigate);
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
    it("should call onPreviousTask when 'j' is pressed", () => {
      const defaultProps = createDefaultProps();
      renderHook(() => useNowShortcuts(defaultProps));

      pressKey("j");

      expect(defaultProps.onPreviousTask).toHaveBeenCalled();
    });

    it("should call onNextTask when 'k' is pressed", () => {
      const defaultProps = createDefaultProps();
      renderHook(() => useNowShortcuts(defaultProps));

      pressKey("k");

      expect(defaultProps.onNextTask).toHaveBeenCalled();
    });

    it("should handle case-insensitive key matching for 'j'", () => {
      const defaultProps = createDefaultProps();
      renderHook(() => useNowShortcuts(defaultProps));

      pressKey("J");

      expect(defaultProps.onPreviousTask).toHaveBeenCalled();
    });

    it("should handle case-insensitive key matching for 'k'", () => {
      const defaultProps = createDefaultProps();
      renderHook(() => useNowShortcuts(defaultProps));

      pressKey("K");

      expect(defaultProps.onNextTask).toHaveBeenCalled();
    });

    it("should not handle task shortcuts when there is no focused task", () => {
      const defaultProps = createDefaultProps();
      const props = { ...defaultProps, focusedTask: null };

      renderHook(() => useNowShortcuts(props));

      pressKey("j");

      expect(props.onPreviousTask).not.toHaveBeenCalled();
    });

    it("should not handle task shortcuts when there are no available tasks", () => {
      const defaultProps = createDefaultProps();
      const props = { ...defaultProps, availableTasks: [] };

      renderHook(() => useNowShortcuts(props));

      pressKey("k");

      expect(props.onNextTask).not.toHaveBeenCalled();
    });

    it("should handle task shortcuts when focusedTask exists and availableTasks has items", () => {
      const defaultProps = createDefaultProps();
      renderHook(() => useNowShortcuts(defaultProps));

      pressKey("j");

      expect(defaultProps.onPreviousTask).toHaveBeenCalled();
    });

    it("should call onCompleteTask when 'Enter' is pressed", () => {
      const defaultProps = createDefaultProps();
      renderHook(() => useNowShortcuts(defaultProps));

      pressKey("Enter");

      expect(defaultProps.onCompleteTask).toHaveBeenCalled();
    });

    it("should not handle Enter shortcut when there is no focused task", () => {
      const defaultProps = createDefaultProps();
      const props = { ...defaultProps, focusedTask: null };

      renderHook(() => useNowShortcuts(props));

      pressKey("Enter");

      expect(props.onCompleteTask).not.toHaveBeenCalled();
    });
  });

  describe("editable element handling", () => {
    it("should not handle shortcuts when typing in input elements", () => {
      const defaultProps = createDefaultProps();
      renderHook(() => useNowShortcuts(defaultProps));

      const input = document.createElement("input");

      document.body.appendChild(input);

      input.focus();

      pressKey("j", {}, input);

      expect(defaultProps.onPreviousTask).not.toHaveBeenCalled();
    });

    it("should not handle shortcuts when typing in textarea elements", () => {
      const defaultProps = createDefaultProps();
      renderHook(() => useNowShortcuts(defaultProps));

      const textarea = document.createElement("textarea");

      document.body.appendChild(textarea);

      textarea.focus();

      pressKey("k", {}, textarea);

      expect(defaultProps.onNextTask).not.toHaveBeenCalled();
    });

    it("should not handle shortcuts when typing in contenteditable elements", () => {
      const defaultProps = createDefaultProps();
      renderHook(() => useNowShortcuts(defaultProps));

      const div = document.createElement("div");

      div.setAttribute("contenteditable", "true");
      Object.defineProperty(div, "isContentEditable", { value: true });

      document.body.appendChild(div);

      div.focus();

      pressKey("j", {}, div);

      expect(defaultProps.onPreviousTask).not.toHaveBeenCalled();
    });
  });
});

afterAll(() => {
  mock.restore();
});
