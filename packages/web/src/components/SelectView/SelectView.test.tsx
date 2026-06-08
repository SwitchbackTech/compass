import { type ReactElement, type ReactNode } from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockNavigate = mock();
const actualReactRouterDom = await import("react-router-dom");

mock.module("react-router-dom", () => ({
  ...actualReactRouterDom,
  useNavigate: () => mockNavigate,
}));

mock.module("@web/components/Shortcuts/ShortcutHint", () => ({
  ShortcutHint: ({ children }: { children: ReactNode }) => (
    <span aria-hidden data-testid="shortcut-hint">
      {children}
    </span>
  ),
}));

const { MemoryRouter } = await import("react-router-dom");
const { SelectView } = await import("./SelectView");

describe("SelectView", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  const renderWithRouter = (
    component: ReactElement,
    initialRoute: string = ROOT_ROUTES.WEEK,
  ) => {
    return render(
      <MemoryRouter
        initialEntries={[initialRoute]}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        {component}
      </MemoryRouter>,
    );
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
    it("renders button with current view label for Week view", () => {
      renderWithRouter(<SelectView />, ROOT_ROUTES.WEEK);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Week");
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("renders button with current view label for Day view", () => {
      renderWithRouter(<SelectView />, ROOT_ROUTES.DAY);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Day");
    });

    it("renders button with current view label for Day view with date param", () => {
      renderWithRouter(<SelectView />, `${ROOT_ROUTES.DAY}/2024-01-15`);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Day");
    });

    it("renders Day and Week options with shortcut hints when dropdown is open", async () => {
      renderWithRouter(<SelectView />);

      await openDropdown();

      const dropdown = screen.getByTestId("view-select-dropdown");
      const withinDropdown = within(dropdown);

      expect(
        withinDropdown
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toEqual(["Dayd", "Weekw"]);

      const shortcutHints = withinDropdown.getAllByTestId("shortcut-hint");
      expect(shortcutHints).toHaveLength(2);
      expect(shortcutHints[0]).toHaveTextContent("d");
      expect(shortcutHints[1]).toHaveTextContent("w");
    });
  });

  describe("Route Detection", () => {
    it("detects Day view when on /day route", () => {
      renderWithRouter(<SelectView />, ROOT_ROUTES.DAY);

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Day");
    });

    it("detects Day view when on /day/:date route", () => {
      renderWithRouter(<SelectView />, `${ROOT_ROUTES.DAY}/2024-01-15`);

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Day");
    });

    it("detects Week view when on /week route", () => {
      renderWithRouter(<SelectView />, ROOT_ROUTES.WEEK);

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Week");
    });

    it("defaults to Week view for unknown routes", () => {
      renderWithRouter(<SelectView />, "/unknown-route");

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Week");
    });
  });

  describe("Dropdown Behavior", () => {
    it("opens dropdown when button is clicked", async () => {
      renderWithRouter(<SelectView />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-expanded", "false");

      await openDropdown();

      expect(button).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("option", { name: /day/i })).toBeInTheDocument();
    });

    it("closes dropdown when clicking outside", async () => {
      renderWithRouter(<SelectView />);

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
      renderWithRouter(<SelectView />);

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
      renderWithRouter(<SelectView />, ROOT_ROUTES.DAY);

      await openDropdown();

      const dayOption = screen.getByRole("option", { name: /day/i });
      expect(dayOption).toHaveAttribute("aria-selected", "true");
      expect(dayOption).toHaveClass("bg-fg-primary");

      const weekOption = screen.getByRole("option", { name: /week/i });
      expect(weekOption).toHaveAttribute("aria-selected", "false");
    });

    it("uses div elements for options instead of buttons", async () => {
      renderWithRouter(<SelectView />);

      await openDropdown();

      const dayOption = screen.getByRole("option", { name: /day/i });
      expect(dayOption.tagName).toBe("DIV");
      expect(dayOption.tagName).not.toBe("BUTTON");
    });
  });

  describe("User Interactions", () => {
    it("navigates to Day route when Day option is clicked", async () => {
      renderWithRouter(<SelectView />);

      const { user } = await openDropdown();

      const dropdown = screen.getByTestId("view-select-dropdown");
      const withinDropdown = within(dropdown);
      const dayOption = withinDropdown.getByRole("option", { name: /day/i });
      await user.click(dayOption);

      expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.DAY);
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it("navigates to Week route when Week option is clicked", async () => {
      renderWithRouter(<SelectView />);

      const { user } = await openDropdown();

      const dropdown = screen.getByTestId("view-select-dropdown");
      const withinDropdown = within(dropdown);
      const weekOption = withinDropdown.getByRole("option", { name: /week/i });
      await user.click(weekOption);

      expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.WEEK);
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it("closes dropdown after option selection", async () => {
      renderWithRouter(<SelectView />);

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
      renderWithRouter(<SelectView />);

      await openDropdown();

      const dayOption = screen.getByRole("option", { name: /day/i });
      const shortcutHint = dayOption.querySelector(
        '[data-testid="shortcut-hint"]',
      );
      expect(shortcutHint).toHaveTextContent("d");
    });

    it("displays w shortcut hint for Week option", async () => {
      renderWithRouter(<SelectView />);

      await openDropdown();

      const weekOption = screen.getByRole("option", { name: /week/i });
      const shortcutHint = weekOption.querySelector(
        '[data-testid="shortcut-hint"]',
      );
      expect(shortcutHint).toHaveTextContent("w");
    });
  });

  describe("Keyboard Navigation", () => {
    it("navigates to next option with ArrowDown", async () => {
      renderWithRouter(<SelectView />, ROOT_ROUTES.DAY);

      const { user } = await openDropdown();

      const dayOption = screen.getByRole("option", { name: /day/i });
      dayOption.focus();

      await user.keyboard("{ArrowDown}");

      await waitFor(() => {
        const weekOption = screen.getByRole("option", { name: /week/i });
        expect(weekOption.className).toContain("ring-1");
      });
    });

    it("navigates to previous option with ArrowUp", async () => {
      renderWithRouter(<SelectView />, ROOT_ROUTES.DAY);

      const { user } = await openDropdown();

      const dayOption = screen.getByRole("option", { name: /day/i });
      dayOption.focus();

      await user.keyboard("{ArrowUp}");

      await waitFor(() => {
        const weekOption = screen.getByRole("option", { name: /week/i });
        expect(weekOption.className).toContain("ring-1");
      });
    });

    it("selects highlighted option with Enter key", async () => {
      renderWithRouter(<SelectView />, ROOT_ROUTES.DAY);

      const { user } = await openDropdown();

      const dayOption = screen.getByRole("option", { name: /day/i });
      dayOption.focus();

      await user.keyboard("{ArrowDown}");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.WEEK);
      });
    });

    it("selects highlighted option with Space key", async () => {
      renderWithRouter(<SelectView />, ROOT_ROUTES.WEEK);

      const { user } = await openDropdown();

      const weekOption = screen.getByRole("option", { name: /week/i });
      weekOption.focus();

      await user.keyboard("{ArrowDown}");
      await user.keyboard(" ");

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.DAY);
      });
    });

    it("initializes highlight to current view when dropdown opens", async () => {
      renderWithRouter(<SelectView />, ROOT_ROUTES.DAY);

      const { user } = await openDropdown();

      const dayOption = screen.getByRole("option", { name: /day/i });
      dayOption.focus();

      expect(dayOption).toHaveAttribute("aria-selected", "true");
      expect(dayOption).toHaveClass("bg-fg-primary");

      await user.keyboard("{ArrowDown}");

      await waitFor(() => {
        const weekOption = screen.getByRole("option", { name: /week/i });
        expect(weekOption.className).toContain("ring-1");
      });
    });

    it("wraps navigation from last to first option", async () => {
      renderWithRouter(<SelectView />, ROOT_ROUTES.WEEK);

      const { user } = await openDropdown();

      const weekOption = screen.getByRole("option", { name: /week/i });
      weekOption.focus();

      await user.keyboard("{ArrowDown}");

      await waitFor(() => {
        const dayOption = screen.getByRole("option", { name: /day/i });
        expect(dayOption.className).toContain("ring-1");
      });
    });

    it("wraps navigation from first to last option", async () => {
      renderWithRouter(<SelectView />, ROOT_ROUTES.DAY);

      const { user } = await openDropdown();

      const dayOption = screen.getByRole("option", { name: /day/i });
      dayOption.focus();

      await user.keyboard("{ArrowUp}");

      await waitFor(() => {
        const weekOption = screen.getByRole("option", { name: /week/i });
        expect(weekOption.className).toContain("ring-1");
      });
    });
  });
});
