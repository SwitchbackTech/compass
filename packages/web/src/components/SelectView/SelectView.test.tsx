import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { SelectView } from "./SelectView";

// Mock ShortcutHint component
jest.mock(
  "@web/views/Day/components/Shortcuts/components/ShortcutHint",
  () => ({
    ShortcutHint: ({ children }: { children: React.ReactNode }) => (
      <span data-testid="shortcut-hint">{children}</span>
    ),
  }),
);

describe("SelectView", () => {
  const mockOnSelectNow = jest.fn();
  const mockOnSelectDay = jest.fn();
  const mockOnSelectWeek = jest.fn();

  const defaultProps = {
    onSelectNow: mockOnSelectNow,
    onSelectDay: mockOnSelectDay,
    onSelectWeek: mockOnSelectWeek,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithRouter = (
    component: React.ReactElement,
    initialRoute: string = "/",
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
      renderWithRouter(<SelectView {...defaultProps} />, ROOT_ROUTES.ROOT);

      const button = screen.getByRole("button", { name: /week/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("renders button with current view label for Now view", () => {
      renderWithRouter(<SelectView {...defaultProps} />, ROOT_ROUTES.NOW);

      const button = screen.getByRole("button", { name: /now/i });
      expect(button).toBeInTheDocument();
    });

    it("renders button with current view label for Day view", () => {
      renderWithRouter(<SelectView {...defaultProps} />, ROOT_ROUTES.DAY);

      const button = screen.getByRole("button", { name: /day/i });
      expect(button).toBeInTheDocument();
    });

    it("renders button with current view label for Day view with date param", () => {
      renderWithRouter(
        <SelectView {...defaultProps} />,
        `${ROOT_ROUTES.DAY}/2024-01-15`,
      );

      const button = screen.getByRole("button", { name: /day/i });
      expect(button).toBeInTheDocument();
    });

    it("renders all three options with shortcut hints when dropdown is open", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView {...defaultProps} />);

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
      expect(shortcutHints[0]).toHaveTextContent("1");
      expect(shortcutHints[1]).toHaveTextContent("2");
      expect(shortcutHints[2]).toHaveTextContent("3");
    });
  });

  describe("Route Detection", () => {
    it("detects Now view when on /now route", () => {
      renderWithRouter(<SelectView {...defaultProps} />, ROOT_ROUTES.NOW);

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Now");
    });

    it("detects Day view when on /day route", () => {
      renderWithRouter(<SelectView {...defaultProps} />, ROOT_ROUTES.DAY);

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Day");
    });

    it("detects Day view when on /day/:date route", () => {
      renderWithRouter(
        <SelectView {...defaultProps} />,
        `${ROOT_ROUTES.DAY}/2024-01-15`,
      );

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Day");
    });

    it("detects Week view when on / route", () => {
      renderWithRouter(<SelectView {...defaultProps} />, ROOT_ROUTES.ROOT);

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Week");
    });

    it("defaults to Week view for unknown routes", () => {
      renderWithRouter(<SelectView {...defaultProps} />, "/unknown-route");

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Week");
    });
  });

  describe("Dropdown Behavior", () => {
    it("opens dropdown when button is clicked", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView {...defaultProps} />);

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
      renderWithRouter(<SelectView {...defaultProps} />);

      const button = screen.getByRole("button");
      await act(async () => {
        user.click(button);
      });

      await waitFor(() => {
        expect(screen.getByText("Now")).toBeInTheDocument();
      });

      // Click outside the dropdown
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByText("Now")).not.toBeInTheDocument();
        expect(button).toHaveAttribute("aria-expanded", "false");
      });
    });

    it("closes dropdown when ESC key is pressed", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView {...defaultProps} />);

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
      renderWithRouter(<SelectView {...defaultProps} />, ROOT_ROUTES.NOW);

      const button = screen.getByRole("button");
      await act(async () => {
        user.click(button);
      });

      await waitFor(() => {
        const nowOption = screen.getByRole("option", { name: /now/i });
        expect(nowOption).toHaveAttribute("aria-selected", "true");
        expect(nowOption).toHaveClass("bg-white/20");

        const dayOption = screen.getByRole("option", { name: /day/i });
        expect(dayOption).toHaveAttribute("aria-selected", "false");

        const weekOption = screen.getByRole("option", { name: /week/i });
        expect(weekOption).toHaveAttribute("aria-selected", "false");
      });
    });
  });

  describe("User Interactions", () => {
    it("calls onSelectNow when Now option is clicked", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView {...defaultProps} />);

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

      expect(mockOnSelectNow).toHaveBeenCalledTimes(1);
      expect(mockOnSelectDay).not.toHaveBeenCalled();
      expect(mockOnSelectWeek).not.toHaveBeenCalled();
    });

    it("calls onSelectDay when Day option is clicked", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView {...defaultProps} />);

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

      expect(mockOnSelectDay).toHaveBeenCalledTimes(1);
      expect(mockOnSelectNow).not.toHaveBeenCalled();
      expect(mockOnSelectWeek).not.toHaveBeenCalled();
    });

    it("calls onSelectWeek when Week option is clicked", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView {...defaultProps} />);

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

      expect(mockOnSelectWeek).toHaveBeenCalledTimes(1);
      expect(mockOnSelectNow).not.toHaveBeenCalled();
      expect(mockOnSelectDay).not.toHaveBeenCalled();
    });

    it("closes dropdown after option selection", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView {...defaultProps} />);

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
    it("displays 1 shortcut hint for Now option", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView {...defaultProps} />);

      const button = screen.getByRole("button");
      await act(async () => {
        user.click(button);
      });

      await waitFor(() => {
        const nowOption = screen.getByRole("option", { name: /now/i });
        const shortcutHint = nowOption.querySelector(
          '[data-testid="shortcut-hint"]',
        );
        expect(shortcutHint).toHaveTextContent("1");
      });
    });

    it("displays 2 shortcut hint for Day option", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView {...defaultProps} />);

      const button = screen.getByRole("button");
      await act(async () => {
        user.click(button);
      });

      await waitFor(() => {
        const dayOption = screen.getByRole("option", { name: /day/i });
        const shortcutHint = dayOption.querySelector(
          '[data-testid="shortcut-hint"]',
        );
        expect(shortcutHint).toHaveTextContent("2");
      });
    });

    it("displays 3 shortcut hint for Week option", async () => {
      const user = userEvent.setup();
      renderWithRouter(<SelectView {...defaultProps} />);

      const button = screen.getByRole("button");
      await act(async () => {
        user.click(button);
      });

      await waitFor(() => {
        const weekOption = screen.getByRole("option", { name: /week/i });
        const shortcutHint = weekOption.querySelector(
          '[data-testid="shortcut-hint"]',
        );
        expect(shortcutHint).toHaveTextContent("3");
      });
    });
  });
});
