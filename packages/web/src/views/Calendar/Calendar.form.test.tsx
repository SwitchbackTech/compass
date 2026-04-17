import { type ReactNode, type SyntheticEvent } from "react";
import { createMemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CLIMB } from "@core/__mocks__/v1/events/events.misc";
import { preloadedState } from "@web/__tests__/__mocks__/state/state.weekEvents";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

const mockRecipeInit = mock(() => ({}));
const mockSuperTokensInit = mock();
const mockUseEventListener = mock();
const mockBaseApiAdapter = mock(async () => ({
  config: { method: "GET", url: "" },
  data: [],
  headers: new Headers(),
  status: 200,
  statusText: "OK",
}));

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

// Mock IntersectionObserver for jsdom
global.IntersectionObserver = class IntersectionObserver {
  root: Element | null = null;
  rootMargin: string = "";
  thresholds: ReadonlyArray<number> = [];
  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    void callback;
    void options;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
} as typeof IntersectionObserver;

mock.module("@web/views/Calendar/hooks/mouse/useEventListener", () => ({
  useEventListener: mockUseEventListener,
}));

mock.module("@web/common/utils/dom/event-target-visibility.util", () => ({
  onEventTargetVisibility:
    (callback: () => void, visible = false) =>
    (event: SyntheticEvent<Element, Event>) => {
      void visible;
      void event;
      callback();
    },
}));

mock.module("@web/auth/compass/session/session.util", () => ({
  getUserId: async () => "test-user-id",
}));

mock.module("@web/common/hooks/useVersionCheck", () => ({
  useVersionCheck: () => ({
    currentVersion: "test",
    isUpdateAvailable: false,
  }),
}));

const { render } =
  require("@web/__tests__/__mocks__/mock.render") as typeof import("@web/__tests__/__mocks__/mock.render");
const { BaseApi } =
  require("@web/common/apis/base/base.api") as typeof import("@web/common/apis/base/base.api");
const { CalendarView } =
  require("@web/views/Calendar") as typeof import("@web/views/Calendar");

function Component() {
  return <CalendarView />;
}

const router = createMemoryRouter([{ index: true, Component }], {
  initialEntries: ["/"],
});

const mockConfirm = spyOn(window, "confirm");

describe("Event Form", () => {
  beforeEach(() => {
    BaseApi.defaults.adapter = mockBaseApiAdapter;
    mockConfirm.mockReset();
    mockBaseApiAdapter.mockClear();
    mockUseEventListener.mockClear();
  });
  it("closes after clicking outside", async () => {
    render(<></>, { router, state: preloadedState });

    const user = userEvent.setup();

    const climbBtn = document.querySelector(
      `[data-event-id="${CLIMB._id}"]`,
    ) as HTMLElement;
    await user.click(climbBtn);

    await user.click(document.body);

    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  describe("DatePicker", () => {
    it("does not open dialog by default", async () => {
      const user = userEvent.setup();

      const { container } = render(<></>, { router, state: preloadedState });

      const climbBtn = document.querySelector(
        `[data-event-id="${CLIMB._id}"]`,
      ) as HTMLElement;
      await user.click(climbBtn);

      expect(container.getElementsByClassName("startDatePicker")).toHaveLength(
        0,
      );
    });
  });
});
