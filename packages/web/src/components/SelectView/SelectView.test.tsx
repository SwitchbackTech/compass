import { RouterProvider } from "@tanstack/react-router";
import { type ReactElement, type ReactNode } from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestRouter } from "@web/__tests__/utils/providers/createTestRouter";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockNavigate = mock();
const actualTanstackRouter = await import("@tanstack/react-router");

mock.module("@tanstack/react-router", () => ({
  ...actualTanstackRouter,
  useNavigate: () => mockNavigate,
}));

mock.module("@web/components/Shortcuts/ShortcutHint", () => ({
  ShortcutHint: ({ children }: { children: ReactNode }) => (
    <span aria-hidden data-testid="shortcut-hint">
      {children}
    </span>
  ),
}));

const { SelectView } = await import("./SelectView");

describe("SelectView", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  const renderWithRouter = async (
    component: ReactElement,
    initialRoute: string = ROOT_ROUTES.WEEK,
  ) => {
    const router = createTestRouter(component, {
      initialEntries: [initialRoute],
    });
    const result = render(<RouterProvider router={router} />);

    // TanStack's RouterProvider resolves the initial match asynchronously
    // (even with no loaders), unlike react-router-dom's synchronous
    // MemoryRouter, so tests must wait for it to settle before querying.
    await waitFor(() => {
      expect(router.state.status).toBe("idle");
    });

    return result;
  };

  async function openDropdown() {
    const user = userEvent.setup();
    const button = screen.getByRole("button");
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByTestId("view-select-dropdown")).toBeInTheDocument();
    });

    return { button, user };
  }

  describe("Component Rendering", () => {
    it("renders button with current view label for Week view", async () => {
      await renderWithRouter(<SelectView />, ROOT_ROUTES.WEEK);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Week");
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("renders button with current view label for Day view", async () => {
      await renderWithRouter(<SelectView />, ROOT_ROUTES.DAY);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Day");
    });

    it("renders button with current view label for Day view with date param", async () => {
      await renderWithRouter(<SelectView />, `${ROOT_ROUTES.DAY}/2024-01-15`);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Day");
    });

    it("renders Day and Week options with shortcut hints when dropdown is open", async () => {
      await renderWithRouter(<SelectView />);

      await openDropdown();

      const dropdown = screen.getByTestId("view-select-dropdown");
      const withinDropdown = within(dropdown);

      expect(
        withinDropdown
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toEqual(["DayD", "WeekW"]);

      const shortcutHints = withinDropdown.getAllByTestId("shortcut-hint");
      expect(shortcutHints).toHaveLength(2);
      expect(shortcutHints[0]).toHaveTextContent("D");
      expect(shortcutHints[1]).toHaveTextContent("W");
    });
  });

  describe("Route Detection", () => {
    it("detects Day view when on /day route", async () => {
      await renderWithRouter(<SelectView />, ROOT_ROUTES.DAY);

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Day");
    });

    it("detects Day view when on /day/:date route", async () => {
      await renderWithRouter(<SelectView />, `${ROOT_ROUTES.DAY}/2024-01-15`);

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Day");
    });

    it("detects Week view when on /week route", async () => {
      await renderWithRouter(<SelectView />, ROOT_ROUTES.WEEK);

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Week");
    });

    it("defaults to Week view for unknown routes", async () => {
      await renderWithRouter(<SelectView />, "/unknown-route");

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Week");
    });
  });

  describe("Dropdown Behavior", () => {
    it("opens dropdown when button is clicked", async () => {
      await renderWithRouter(<SelectView />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-expanded", "false");

      await openDropdown();

      expect(button).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("option", { name: /day/i })).toBeInTheDocument();
    });

    it("closes dropdown when clicking outside", async () => {
      await renderWithRouter(<SelectView />);

      const { button, user } = await openDropdown();

      await user.click(document.body);

      await waitFor(() => {
        expect(
          screen.queryByTestId("view-select-dropdown"),
        ).not.toBeInTheDocument();
        expect(button).toHaveAttribute("aria-expanded", "false");
      });
    });

    it("closes dropdown when ESC key is pressed", async () => {
      await renderWithRouter(<SelectView />);

      const { button, user } = await openDropdown();

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(
          screen.queryByTestId("view-select-dropdown"),
        ).not.toBeInTheDocument();
        expect(button).toHaveAttribute("aria-expanded", "false");
      });
    });

    it("highlights active view option in dropdown", async () => {
      await renderWithRouter(<SelectView />, ROOT_ROUTES.DAY);

      await openDropdown();

      const dayOption = screen.getByRole("option", { name: /day/i });
      expect(dayOption).toHaveAttribute("aria-selected", "true");

      const weekOption = screen.getByRole("option", { name: /week/i });
      expect(weekOption).toHaveAttribute("aria-selected", "false");
    });

    it("uses div elements for options instead of buttons", async () => {
      await renderWithRouter(<SelectView />);

      await openDropdown();

      const dayOption = screen.getByRole("option", { name: /day/i });
      expect(dayOption.tagName).toBe("DIV");
      expect(dayOption.tagName).not.toBe("BUTTON");
    });
  });

  describe("User Interactions", () => {
    it("navigates to Day route when Day option is clicked", async () => {
      await renderWithRouter(<SelectView />);

      const { user } = await openDropdown();

      const dropdown = screen.getByTestId("view-select-dropdown");
      const withinDropdown = within(dropdown);
      const dayOption = withinDropdown.getByRole("option", { name: /day/i });
      await user.click(dayOption);

      expect(mockNavigate).toHaveBeenCalledWith({ to: ROOT_ROUTES.DAY });
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it("navigates to Week route when Week option is clicked", async () => {
      await renderWithRouter(<SelectView />);

      const { user } = await openDropdown();

      const dropdown = screen.getByTestId("view-select-dropdown");
      const withinDropdown = within(dropdown);
      const weekOption = withinDropdown.getByRole("option", { name: /week/i });
      await user.click(weekOption);

      expect(mockNavigate).toHaveBeenCalledWith({ to: ROOT_ROUTES.WEEK });
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it("closes dropdown after option selection", async () => {
      await renderWithRouter(<SelectView />);

      const { button, user } = await openDropdown();

      const dayOption = screen.getByRole("option", { name: /day/i });
      await user.click(dayOption);

      await waitFor(() => {
        expect(
          screen.queryByTestId("view-select-dropdown"),
        ).not.toBeInTheDocument();
        expect(button).toHaveAttribute("aria-expanded", "false");
      });
    });
  });

  describe("Shortcut Hints", () => {
    it("displays d shortcut hint for Day option", async () => {
      await renderWithRouter(<SelectView />);

      await openDropdown();

      const dayOption = screen.getByRole("option", { name: /day/i });
      const shortcutHint = dayOption.querySelector(
        '[data-testid="shortcut-hint"]',
      );
      expect(shortcutHint).toHaveTextContent("D");
    });

    it("displays w shortcut hint for Week option", async () => {
      await renderWithRouter(<SelectView />);

      await openDropdown();

      const weekOption = screen.getByRole("option", { name: /week/i });
      const shortcutHint = weekOption.querySelector(
        '[data-testid="shortcut-hint"]',
      );
      expect(shortcutHint).toHaveTextContent("W");
    });
  });

  describe("Keyboard Navigation", () => {
    it("navigates to next option with ArrowDown", async () => {
      await renderWithRouter(<SelectView />, ROOT_ROUTES.DAY);

      const { user } = await openDropdown();

      const dayOption = screen.getByRole("option", { name: /day/i });
      dayOption.focus();

      await user.keyboard("{ArrowDown}");

      await waitFor(() => {
        const weekOption = screen.getByRole("option", { name: /week/i });
        expect(weekOption).toHaveAttribute("tabindex", "0");
        expect(dayOption).toHaveAttribute("tabindex", "-1");
      });
    });

    it("navigates to previous option with ArrowUp", async () => {
      await renderWithRouter(<SelectView />, ROOT_ROUTES.DAY);

      const { user } = await openDropdown();

      const dayOption = screen.getByRole("option", { name: /day/i });
      dayOption.focus();

      await user.keyboard("{ArrowUp}");

      await waitFor(() => {
        const weekOption = screen.getByRole("option", { name: /week/i });
        expect(weekOption).toHaveAttribute("tabindex", "0");
        expect(dayOption).toHaveAttribute("tabindex", "-1");
      });
    });

    it("selects highlighted option with Enter key", async () => {
      await renderWithRouter(<SelectView />, ROOT_ROUTES.DAY);

      const { user } = await openDropdown();

      const dayOption = screen.getByRole("option", { name: /day/i });
      dayOption.focus();

      await user.keyboard("{ArrowDown}");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: ROOT_ROUTES.WEEK });
      });
    });

    it("selects highlighted option with Space key", async () => {
      await renderWithRouter(<SelectView />, ROOT_ROUTES.WEEK);

      const { user } = await openDropdown();

      const weekOption = screen.getByRole("option", { name: /week/i });
      weekOption.focus();

      await user.keyboard("{ArrowDown}");
      await user.keyboard(" ");

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: ROOT_ROUTES.DAY });
      });
    });

    it("initializes highlight to current view when dropdown opens", async () => {
      await renderWithRouter(<SelectView />, ROOT_ROUTES.DAY);

      const { user } = await openDropdown();

      const dayOption = screen.getByRole("option", { name: /day/i });
      dayOption.focus();

      expect(dayOption).toHaveAttribute("aria-selected", "true");

      await user.keyboard("{ArrowDown}");

      await waitFor(() => {
        const weekOption = screen.getByRole("option", { name: /week/i });
        expect(weekOption).toHaveAttribute("tabindex", "0");
        expect(dayOption).toHaveAttribute("tabindex", "-1");
      });
    });

    it("wraps navigation from last to first option", async () => {
      await renderWithRouter(<SelectView />, ROOT_ROUTES.WEEK);

      const { user } = await openDropdown();

      const weekOption = screen.getByRole("option", { name: /week/i });
      weekOption.focus();

      await user.keyboard("{ArrowDown}");

      await waitFor(() => {
        const dayOption = screen.getByRole("option", { name: /day/i });
        expect(dayOption).toHaveAttribute("tabindex", "0");
        expect(weekOption).toHaveAttribute("tabindex", "-1");
      });
    });

    it("wraps navigation from first to last option", async () => {
      await renderWithRouter(<SelectView />, ROOT_ROUTES.DAY);

      const { user } = await openDropdown();

      const dayOption = screen.getByRole("option", { name: /day/i });
      dayOption.focus();

      await user.keyboard("{ArrowUp}");

      await waitFor(() => {
        const weekOption = screen.getByRole("option", { name: /week/i });
        expect(weekOption).toHaveAttribute("tabindex", "0");
        expect(dayOption).toHaveAttribute("tabindex", "-1");
      });
    });
  });
});
