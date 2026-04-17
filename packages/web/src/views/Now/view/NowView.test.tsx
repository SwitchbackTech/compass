import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { getModifierKeyTestId } from "@web/common/utils/shortcut/shortcut.util";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const mockRecipeInit = mock(() => ({}));
const mockSuperTokensInit = mock();

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

// Mock the useNowShortcuts hook
mock.module("../shortcuts/useNowShortcuts", () => ({
  useNowShortcuts: mock(),
}));

mock.module("@web/views/Now/view/NowViewContent", () => ({
  NowViewContent: () => <div data-testid="now-view-content" />,
}));

mock.module("@web/views/Now/hooks/useAvailableTasks", () => ({
  useAvailableTasks: () => ({
    availableTasks: [],
    allTasks: [],
    hasCompletedTasks: false,
  }),
}));

const { renderWithMemoryRouter } =
  require("@web/__tests__/utils/providers/MemoryRouter") as typeof import("@web/__tests__/utils/providers/MemoryRouter");
const { NowView } =
  require("@web/views/Now/view/NowView") as typeof import("@web/views/Now/view/NowView");

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

describe("NowView", () => {
  const originalMatchMedia = window.matchMedia;
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    // Simulate wide screen so sidebar is visible
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1400,
    });
    window.matchMedia = mock().mockReturnValue(mockMatchMedia(true));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });
  it("renders the shortcuts sidebar", async () => {
    await renderWithMemoryRouter(<NowView />, [ROOT_ROUTES.NOW]);

    // jest cannot actively determine applied pseudo-classes
    // a browser environment should be used for this test
    // move to playwright
    const sidebar = screen.getByRole("complementary", { hidden: true });
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveAttribute("aria-label", "Shortcuts sidebar");
    expect(screen.getByText("Shortcuts")).toBeInTheDocument();
  });

  it("renders the header with reminder and view selector", async () => {
    await renderWithMemoryRouter(<NowView />, [ROOT_ROUTES.NOW]);

    // Check that Header components are rendered
    expect(screen.getByText("Click to add your reminder")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /select view/i }),
    ).toBeInTheDocument();
  });

  it("renders global shortcuts", async () => {
    await renderWithMemoryRouter(<NowView />, [ROOT_ROUTES.NOW]);

    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.getAllByText("Now")).toHaveLength(3);
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getAllByText("Week")).toHaveLength(1);
  });

  it("renders shortcut keys correctly", async () => {
    await renderWithMemoryRouter(<NowView />, [ROOT_ROUTES.NOW]);

    // Check that shortcut keys are rendered
    expect(screen.getAllByTestId("n-icon").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("d-icon").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("w-icon").length).toBeGreaterThan(0);
  });

  it("renders command palette shortcut", async () => {
    await renderWithMemoryRouter(<NowView />, [ROOT_ROUTES.NOW]);

    // Check that CMD+K shortcut is displayed
    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(
      screen.getAllByTestId(getModifierKeyTestId())[0],
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("k-icon")[0]).toBeInTheDocument();
    expect(screen.getByText("Command Palette")).toBeInTheDocument();
  });

  it("renders the main layout structure", async () => {
    await renderWithMemoryRouter(<NowView />, [ROOT_ROUTES.NOW]);

    // Check that the main calendar container is rendered
    const mainElement = document.getElementById("mainSection");
    expect(mainElement).toBeInTheDocument();
    expect(mainElement).toHaveClass(
      "bg-bg-primary",
      "flex",
      "h-screen",
      "overflow-hidden",
      "flex-1",
      "flex-col",
      "items-center",
      "justify-center",
      "p-8",
    );
  });
});
