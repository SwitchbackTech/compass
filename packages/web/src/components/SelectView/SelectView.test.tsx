import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { SelectView } from "./SelectView";

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Mock ShortcutHint component
jest.mock("@web/components/Shortcuts/ShortcutHint", () => ({
  ShortcutHint: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="shortcut-hint">{children}</span>
  ),
}));

describe("SelectView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithRouter = (
    component: React.ReactElement,
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

  describe("Component Rendering", () => {
    it("renders button with current view label for Week view", () => {
      renderWithRouter(<SelectView />, ROOT_ROUTES.WEEK);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Week");
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("renders button with current view label for Now view", () => {
      renderWithRouter(<SelectView />, ROOT_ROUTES.NOW);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Now");
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

    it("renders all three options with shortcut hints when dropdown is open", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView />);

      const button = screen.getByRole("button");
      await act(async () => {
        user.click(button);
      });

      await waitFor(() => {
        const dropdown = screen.getByTestId("view-select-dropdown");
        expect(dropdown).toBeInTheDocument();
      });

      const dropdown = screen.getByTestId("view-select-dropdown");
      const withinDropdown = within(dropdown);

      const nowOption = withinDropdown.getByRole("option", { name: /now/i });
      const dayOption = withinDropdown.getByRole("option", { name: /day/i });
      const weekOption = withinDropdown.getByRole("option", { name: /week/i });

      expect(nowOption).toBeInTheDocument();
      expect(dayOption).toBeInTheDocument();
      expect(weekOption).toBeInTheDocument();

      const shortcutHints = withinDropdown.getAllByTestId("shortcut-hint");
      expect(shortcutHints).toHaveLength(3);
      expect(shortcutHints[0]).toHaveTextContent("n");
      expect(shortcutHints[1]).toHaveTextContent("d");
      expect(shortcutHints[2]).toHaveTextContent("w");
    });
  });

  describe("Route Detection", () => {
    it("detects Now view when on /now route", () => {
      renderWithRouter(<SelectView />, ROOT_ROUTES.NOW);

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Now");
    });

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
      const user = userEvent.setup();
      renderWithRouter(<SelectView />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-expanded", "false");

      await act(async () => {
        user.click(button);
      });

      await waitFor(() => {
        expect(button).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByText("Now")).toBeInTheDocument();
      });
    });

    it("closes dropdown when clicking outside", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView />);

      const button = screen.getByRole("button");
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(screen.getByText("Now")).toBeInTheDocument();
      });

      // Click outside the dropdown
      await act(async () => {
        await user.click(document.body);
      });

      await waitFor(() => {
        expect(screen.queryByText("Now")).not.toBeInTheDocument();
        expect(button).toHaveAttribute("aria-expanded", "false");
      });
    });

    it("closes dropdown when ESC key is pressed", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView />);

      const button = screen.getByRole("button");
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        const dropdown = screen.getByTestId("view-select-dropdown");
        expect(dropdown).toBeInTheDocument();
        expect(button).toHaveAttribute("aria-expanded", "true");
      });

      await act(async () => {
        await user.keyboard("{Escape}");
      });

      await waitFor(() => {
        expect(
          screen.queryByTestId("view-select-dropdown"),
        ).not.toBeInTheDocument();
        expect(button).toHaveAttribute("aria-expanded", "false");
      });
    });

    it("highlights active view option in dropdown", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView />, ROOT_ROUTES.NOW);

      const button = screen.getByRole("button");
      await act(async () => {
        user.click(button);
      });

      await waitFor(() => {
        const nowOption = screen.getByRole("option", { name: /now/i });
        expect(nowOption).toHaveAttribute("aria-selected", "true");
        expect(nowOption).toHaveClass("bg-fg-primary");

        const dayOption = screen.getByRole("option", { name: /day/i });
        expect(dayOption).toHaveAttribute("aria-selected", "false");

        const weekOption = screen.getByRole("option", { name: /week/i });
        expect(weekOption).toHaveAttribute("aria-selected", "false");
      });
    });

    it("uses div elements for options instead of buttons", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView />);

      const button = screen.getByRole("button");
      await act(async () => {
        user.click(button);
      });

      await waitFor(() => {
        const dropdown = screen.getByTestId("view-select-dropdown");
        expect(dropdown).toBeInTheDocument();
      });

      const nowOption = screen.getByRole("option", { name: /now/i });
      expect(nowOption.tagName).toBe("DIV");
      expect(nowOption.tagName).not.toBe("BUTTON");
    });
  });

  describe("User Interactions", () => {
    it("navigates to Now route when Now option is clicked", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView />);

      const button = screen.getByRole("button");
      await act(async () => {
        user.click(button);
      });

      await waitFor(() => {
        const dropdown = screen.getByTestId("view-select-dropdown");
        expect(dropdown).toBeInTheDocument();
      });

      const dropdown = screen.getByTestId("view-select-dropdown");
      const withinDropdown = within(dropdown);
      const nowOption = withinDropdown.getByRole("option", { name: /now/i });
      await act(async () => {
        await user.click(nowOption);
      });

      expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.NOW);
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it("navigates to Day route when Day option is clicked", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView />);

      const button = screen.getByRole("button");
      await act(async () => {
        user.click(button);
      });

      await waitFor(() => {
        const dropdown = screen.getByTestId("view-select-dropdown");
        expect(dropdown).toBeInTheDocument();
      });

      const dropdown = screen.getByTestId("view-select-dropdown");
      const withinDropdown = within(dropdown);
      const dayOption = withinDropdown.getByRole("option", { name: /day/i });
      await act(async () => {
        await user.click(dayOption);
      });

      expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.DAY);
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it("navigates to Week route when Week option is clicked", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView />);

      const button = screen.getByRole("button");
      await act(async () => {
        user.click(button);
      });

      await waitFor(() => {
        const dropdown = screen.getByTestId("view-select-dropdown");
        expect(dropdown).toBeInTheDocument();
      });

      const dropdown = screen.getByTestId("view-select-dropdown");
      const withinDropdown = within(dropdown);
      const weekOption = withinDropdown.getByRole("option", { name: /week/i });
      await act(async () => {
        await user.click(weekOption);
      });

      expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.WEEK);
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it("closes dropdown after option selection", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView />);

      const button = screen.getByRole("button");
      await act(async () => {
        user.click(button);
      });

      await waitFor(() => {
        expect(screen.getByText("Now")).toBeInTheDocument();
      });

      const nowOption = screen.getByRole("option", { name: /now/i });
      await act(async () => {
        user.click(nowOption);
      });

      await waitFor(() => {
        expect(screen.queryByText("Now")).not.toBeInTheDocument();
        expect(button).toHaveAttribute("aria-expanded", "false");
      });
    });
  });

  describe("Shortcut Hints", () => {
    it("displays n shortcut hint for Now option", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView />);

      const button = screen.getByRole("button");
      await act(async () => {
        user.click(button);
      });

      await waitFor(() => {
        const nowOption = screen.getByRole("option", { name: /now/i });
        const shortcutHint = nowOption.querySelector(
          '[data-testid="shortcut-hint"]',
        );
        expect(shortcutHint).toHaveTextContent("n");
      });
    });

    it("displays d shortcut hint for Day option", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView />);

      const button = screen.getByRole("button");
      await act(async () => {
        user.click(button);
      });

      await waitFor(() => {
        const dayOption = screen.getByRole("option", { name: /day/i });
        const shortcutHint = dayOption.querySelector(
          '[data-testid="shortcut-hint"]',
        );
        expect(shortcutHint).toHaveTextContent("d");
      });
    });

    it("displays w shortcut hint for Week option", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView />);

      const button = screen.getByRole("button");
      await act(async () => {
        user.click(button);
      });

      await waitFor(() => {
        const weekOption = screen.getByRole("option", { name: /week/i });
        const shortcutHint = weekOption.querySelector(
          '[data-testid="shortcut-hint"]',
        );
        expect(shortcutHint).toHaveTextContent("w");
      });
    });
  });

  describe("Keyboard Navigation", () => {
    it("navigates to next option with ArrowDown", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView />, ROOT_ROUTES.WEEK);

      const button = screen.getByRole("button");
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(screen.getByTestId("view-select-dropdown")).toBeInTheDocument();
      });

      // Focus the active item (Week, which is selected)
      const weekOption = screen.getByRole("option", { name: /week/i });
      weekOption.focus();

      // Press ArrowDown - should wrap to Now (index 0)
      await act(async () => {
        await user.keyboard("{ArrowDown}");
      });

      await waitFor(() => {
        const nowOption = screen.getByRole("option", { name: /now/i });
        // Should have active highlighting (ring class)
        expect(nowOption.className).toContain("ring-1");
      });
    });

    it("navigates to previous option with ArrowUp", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView />, ROOT_ROUTES.NOW);

      const button = screen.getByRole("button");
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(screen.getByTestId("view-select-dropdown")).toBeInTheDocument();
      });

      // Focus the active item (Now, which is selected)
      const nowOption = screen.getByRole("option", { name: /now/i });
      nowOption.focus();

      // Press ArrowUp - should wrap to Week (index 2)
      await act(async () => {
        await user.keyboard("{ArrowUp}");
      });

      await waitFor(() => {
        const weekOption = screen.getByRole("option", { name: /week/i });
        // Should have active highlighting (ring class)
        expect(weekOption.className).toContain("ring-1");
      });
    });

    it("selects highlighted option with Enter key", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView />, ROOT_ROUTES.WEEK);

      const button = screen.getByRole("button");
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(screen.getByTestId("view-select-dropdown")).toBeInTheDocument();
      });

      // Focus the active item (Week, which is selected)
      const weekOption = screen.getByRole("option", { name: /week/i });
      weekOption.focus();

      // Navigate to Day option (Week -> Now -> Day)
      await act(async () => {
        await user.keyboard("{ArrowDown}");
      });

      await waitFor(() => {
        const nowOption = screen.getByRole("option", { name: /now/i });
        expect(nowOption.className).toContain("ring-1");
      });

      await act(async () => {
        await user.keyboard("{ArrowDown}");
      });

      await waitFor(() => {
        const dayOption = screen.getByRole("option", { name: /day/i });
        expect(dayOption.className).toContain("ring-1");
      });

      // Press Enter to select Day
      await act(async () => {
        await user.keyboard("{Enter}");
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.DAY);
      });
    });

    it("selects highlighted option with Space key", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView />, ROOT_ROUTES.WEEK);

      const button = screen.getByRole("button");
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(screen.getByTestId("view-select-dropdown")).toBeInTheDocument();
      });

      // Focus the active item (Week, which is selected)
      const weekOption = screen.getByRole("option", { name: /week/i });
      weekOption.focus();

      // Navigate to Now option
      await act(async () => {
        await user.keyboard("{ArrowDown}");
      });

      // Press Space to select Now
      await act(async () => {
        await user.keyboard(" ");
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.NOW);
      });
    });

    it("initializes highlight to current view when dropdown opens", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView />, ROOT_ROUTES.DAY);

      const button = screen.getByRole("button");
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        const dropdown = screen.getByTestId("view-select-dropdown");
        expect(dropdown).toBeInTheDocument();
      });

      // Focus the active item (Day, which is selected)
      const dayOption = screen.getByRole("option", { name: /day/i });
      dayOption.focus();

      // Day option should be both selected and initially highlighted
      expect(dayOption).toHaveAttribute("aria-selected", "true");
      expect(dayOption).toHaveClass("bg-fg-primary");

      // Pressing ArrowDown from Day should move to Week
      await act(async () => {
        await user.keyboard("{ArrowDown}");
      });

      await waitFor(() => {
        const weekOption = screen.getByRole("option", { name: /week/i });
        expect(weekOption.className).toContain("ring-1");
      });
    });

    it("wraps navigation from last to first option", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView />, ROOT_ROUTES.WEEK);

      const button = screen.getByRole("button");
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(screen.getByTestId("view-select-dropdown")).toBeInTheDocument();
      });

      // Focus the active item (Week, which is selected)
      const weekOption = screen.getByRole("option", { name: /week/i });
      weekOption.focus();

      // Start at Week (index 2), press ArrowDown to wrap to Now (index 0)
      await act(async () => {
        await user.keyboard("{ArrowDown}");
      });

      await waitFor(() => {
        const nowOption = screen.getByRole("option", { name: /now/i });
        expect(nowOption.className).toContain("ring-1");
      });
    });

    it("wraps navigation from first to last option", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView />, ROOT_ROUTES.NOW);

      const button = screen.getByRole("button");
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(screen.getByTestId("view-select-dropdown")).toBeInTheDocument();
      });

      // Focus the active item (Now, which is selected)
      const nowOption = screen.getByRole("option", { name: /now/i });
      nowOption.focus();

      // Start at Now (index 0), press ArrowUp to wrap to Week (index 2)
      await act(async () => {
        await user.keyboard("{ArrowUp}");
      });

      await waitFor(() => {
        const weekOption = screen.getByRole("option", { name: /week/i });
        expect(weekOption.className).toContain("ring-1");
      });
    });
  });
});
