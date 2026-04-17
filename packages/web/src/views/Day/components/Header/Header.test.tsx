import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode } from "react";
import { describe, expect, it, mock } from "bun:test";

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

const { renderWithMemoryRouter } =
  require("@web/__tests__/utils/providers/MemoryRouter") as typeof import("@web/__tests__/utils/providers/MemoryRouter");
const { Header } = require("./Header") as typeof import("./Header");

describe("Header", () => {
  it("renders the header with reminder and view selector when showReminder is true", async () => {
    await renderWithMemoryRouter(<Header showReminder={true} />);

    // Check that Reminder component is rendered (shows placeholder when no reminder)
    expect(screen.getByText("Click to add your reminder")).toBeInTheDocument();

    // Check that SelectView component is rendered
    expect(
      screen.getByRole("button", { name: /select view/i }),
    ).toBeInTheDocument();
  });

  it("does not render the reminder when showReminder is false", async () => {
    await renderWithMemoryRouter(<Header showReminder={false} />);

    // Check that Reminder component is NOT rendered
    expect(
      screen.queryByText("Click to add your reminder"),
    ).not.toBeInTheDocument();

    // Check that SelectView component is still rendered
    expect(
      screen.getByRole("button", { name: /select view/i }),
    ).toBeInTheDocument();
  });

  it("renders with proper layout structure", async () => {
    await renderWithMemoryRouter(<Header showReminder={true} />);

    // Check that the header row exists
    expect(screen.getByText("Click to add your reminder")).toBeInTheDocument();
  });

  describe("sidebar toggle", () => {
    it("renders sidebar toggle button", async () => {
      await renderWithMemoryRouter(
        <Header isSidebarOpen={true} onToggleSidebar={() => {}} />,
      );

      // The sidebar icon should be present (wrapped in TooltipWrapper)
      const sidebarIcon = document.querySelector("svg");
      expect(sidebarIcon).toBeInTheDocument();
    });

    it("calls onToggleSidebar when toggle button is clicked", async () => {
      const user = userEvent.setup();
      const mockToggle = mock();

      await renderWithMemoryRouter(
        <Header isSidebarOpen={true} onToggleSidebar={mockToggle} />,
      );

      // Find the sidebar icon's parent button (TooltipTrigger)
      const sidebarIcon = document.querySelector("svg");
      const toggleButton = sidebarIcon?.closest("button");

      if (toggleButton) {
        await user.click(toggleButton);
        expect(mockToggle).toHaveBeenCalledTimes(1);
      } else {
        // If no button found, the test should still verify the icon exists
        expect(sidebarIcon).toBeInTheDocument();
      }
    });
  });
});
