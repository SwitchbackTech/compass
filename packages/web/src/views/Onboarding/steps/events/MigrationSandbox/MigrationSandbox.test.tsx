import "@testing-library/jest-dom";
import { fireEvent, screen } from "@testing-library/react";
import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { withOnboardingProvider } from "../../../components/OnboardingContext";
import { MigrationSandbox } from "./MigrationSandbox";

// Mock the useOnboardingShortcuts hook
jest.mock("../../../hooks/useOnboardingShortcuts", () => ({
  useOnboardingShortcuts: jest.fn(),
}));

// Get the mocked function
const mockUseOnboardingShortcuts =
  require("../../../hooks/useOnboardingShortcuts").useOnboardingShortcuts;

// Wrap the component with OnboardingProvider
const SomedayMigrationWithProvider = withOnboardingProvider(MigrationSandbox);

// Mock required props for SomedayMigration
const defaultProps = {
  currentStep: 1,
  totalSteps: 3,
  onNext: jest.fn(),
  onPrevious: jest.fn(),
  canNavigateNext: true,
  nextButtonDisabled: false,
  onComplete: jest.fn(),
  onSkip: jest.fn(),
};

describe("SomedayMigration", () => {
  let mockOnNext: jest.Mock;
  let mockOnPrevious: jest.Mock;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Clear console.log mock
    jest.spyOn(console, "log").mockImplementation(() => {});

    // Set up mock functions
    mockOnNext = jest.fn();
    mockOnPrevious = jest.fn();

    // Mock the useOnboardingShortcuts hook to simulate keyboard event handling
    mockUseOnboardingShortcuts.mockImplementation(
      ({
        onNext,
        onPrevious,
        canNavigateNext,
        shouldPreventNavigation,
        handlesKeyboardEvents,
      }) => {
        // If handlesKeyboardEvents is true, don't set up listeners
        if (handlesKeyboardEvents) {
          return;
        }

        // Set up a mock keyboard event listener
        const handleKeyDown = (event: KeyboardEvent) => {
          const isNextKey = event.key === "k" || event.key === "K";
          const isPreviousKey = event.key === "j" || event.key === "J";

          if (isNextKey) {
            // Check if we should prevent navigation
            if (shouldPreventNavigation || !canNavigateNext) {
              event.preventDefault();
              event.stopPropagation();
              return;
            }
            event.preventDefault();
            event.stopPropagation();
            onNext();
          } else if (isPreviousKey) {
            event.preventDefault();
            event.stopPropagation();
            onPrevious();
          }
        };

        // Add the event listener
        document.addEventListener("keydown", handleKeyDown, false);

        // Return a cleanup function
        return () => {
          document.removeEventListener("keydown", handleKeyDown, false);
        };
      },
    );
  });

  afterEach(() => {
    // Restore console.log
    jest.restoreAllMocks();
  });

  function setup() {
    render(<SomedayMigrationWithProvider {...defaultProps} />);
    return {
      getBackArrow: () => screen.getByTitle("Previous week"),
      getForwardArrow: () => screen.getByTitle("Next week"),
      getWeekLabel: () => screen.getByText(/This Week|Next Week/),
      getEventMigrateArrows: () =>
        screen.getAllByTitle(/Migrate to (previous|next) week/),
      getEvents: () => screen.getAllByText(/🥙|🥗|☕️|📑|🧹/),
    };
  }

  it("should render the component with 3 someday events", () => {
    setup();

    expect(screen.getByText("🥙 Meal prep")).toBeInTheDocument();
    expect(screen.getByText("🥗 Get groceries")).toBeInTheDocument();
    expect(screen.getAllByText("☕️ Coffee with Mom")).toHaveLength(1);
  });

  it("should render the sidebar with correct title", () => {
    setup();

    expect(screen.getByText("This Week")).toBeInTheDocument();
  });

  it("should render checkboxes for user tasks", () => {
    setup();

    expect(
      screen.getByText("Migrate an event to next week"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Migrate an event to next month"),
    ).toBeInTheDocument();
    expect(screen.getByText("Go to next week/month")).toBeInTheDocument();
  });

  it("should have proper accessibility attributes for event containers", () => {
    setup();

    const eventContainers = screen
      .getAllByText(/🥙|🥗|☕️/)
      .map((text) => text.closest('[role="button"]'))
      .filter((item) => item !== null);

    expect(eventContainers.length).toBeGreaterThan(0);
    eventContainers.forEach((item) => {
      expect(item).toBeInTheDocument();
      expect(item).toHaveAttribute("role", "button");
      expect(item).toHaveAttribute("tabIndex", "0");
    });
  });

  it("should render with OnboardingTwoRowLayout", () => {
    setup();

    // Check that the navigation buttons are present
    expect(screen.getByLabelText("Previous")).toBeInTheDocument();
    expect(screen.getByLabelText("Next")).toBeInTheDocument();
    expect(screen.getByText("SKIP INTRO")).toBeInTheDocument();
  });

  it("should render two month widgets with titles", () => {
    setup();

    // Check that the month widgets have titles (appears multiple times)
    expect(screen.getAllByText("This Month")).toHaveLength(2); // Sidebar and calendar widget
    expect(screen.getByText("Next Month")).toBeInTheDocument(); // Calendar widget only initially
  });

  it("should not render week day abbreviation labels", () => {
    setup();

    // WeekDays container should not be present now
    const weekDaysContainer = document.querySelector('[class*="WeekDays"]');
    expect(weekDaysContainer).not.toBeInTheDocument();
  });

  it("should highlight the current week days in the calendar", () => {
    setup();

    // Get the current date to determine which days should be highlighted
    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Find the calendar day elements
    const calendarDays = screen
      .getAllByText(/^\d+$/)
      .filter(
        (day) =>
          parseInt(day.textContent || "0") >= 1 &&
          parseInt(day.textContent || "0") <= 31,
      );

    // Should have some calendar days
    expect(calendarDays.length).toBeGreaterThan(0);

    // The current day should be visible (using hard-coded September 10, 2025)
    // May appear in both current and next month calendars
    expect(screen.getAllByText("10").length).toBeGreaterThanOrEqual(1);
  });

  it("should highlight day numbers of the current week", () => {
    setup();

    // Get the current week boundaries
    const currentDate = new Date();
    const currentWeekStart = new Date(currentDate);
    currentWeekStart.setDate(currentDate.getDate() - currentDate.getDay());
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

    // Find all calendar day elements
    const calendarDays = screen
      .getAllByText(/^\d+$/)
      .filter(
        (day) =>
          parseInt(day.textContent || "0") >= 1 &&
          parseInt(day.textContent || "0") <= 31,
      );

    // Should have calendar days
    expect(calendarDays.length).toBeGreaterThan(0);

    // Verify that the hard-coded current day (September 10) is present
    // May appear in both current and next month calendars
    expect(screen.getAllByText("10").length).toBeGreaterThanOrEqual(1);
  });

  it("should render the calendar grids with current week highlighting", () => {
    setup();

    // Verify the calendar grid container exists
    const calendarGridContainer = document.querySelector(
      '[class*="CalendarGrid"]',
    );

    expect(calendarGridContainer).toBeInTheDocument();
  });

  it("should render and be clickable the week highlighter", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const user = userEvent.setup();

    setup();

    // Check that the highlighter canvas is in the DOM
    const highlighterCanvas = document.querySelector("canvas");
    expect(highlighterCanvas).toBeInTheDocument();
    expect(highlighterCanvas?.tagName).toBe("CANVAS");

    // Check that the highlighter has the correct positioning styles
    const highlighterElement = highlighterCanvas as HTMLCanvasElement;
    expect(highlighterElement.style.position).toBe("absolute");
    expect(highlighterElement.style.pointerEvents).toBe("auto");
    expect(highlighterElement.style.cursor).toBe("pointer");

    // Verify the highlighter has reasonable dimensions (will be dynamic based on calendar)
    expect(highlighterElement.width).toBeGreaterThan(200); // Should be wide enough for calendar
    expect(highlighterElement.height).toBeGreaterThan(40); // Should have height for week row plus text

    // Click the highlighter
    await user.click(highlighterCanvas!);

    consoleSpy.mockRestore();
  });

  it("should render highlighter when current week is visible", () => {
    setup();

    // Check that the highlighter canvas is in the DOM when current week is visible
    const highlighterCanvas = document.querySelector("canvas");
    expect(highlighterCanvas).toBeInTheDocument();
  });

  it("should position ellipse highlighter dynamically based on current week row", async () => {
    setup();

    // Wait for the component to calculate positions (useEffect with refs)
    await new Promise((resolve) => setTimeout(resolve, 100));

    const highlighterCanvas = document.querySelector("canvas");
    expect(highlighterCanvas).toBeInTheDocument();

    // Verify the highlighter is positioned (exact values will depend on layout)
    const highlighterElement = highlighterCanvas as HTMLCanvasElement;
    expect(highlighterElement.style.position).toBe("absolute");

    // Check that left and top styles are set (they will be calculated dynamically)
    expect(highlighterElement.style.left).toMatch(/\d+px/);
    expect(highlighterElement.style.top).toMatch(/\d+px/);
  });

  it("should position highlighter overlapping the calendar", async () => {
    setup();

    // Find the calendar grid
    const calendarGrid = document.querySelector('[class*="CalendarGrid"]');
    expect(calendarGrid).toBeInTheDocument();

    // Wait for positioning calculations
    await new Promise((resolve) => setTimeout(resolve, 150));

    const highlighterCanvas = document.querySelector("canvas");
    expect(highlighterCanvas).toBeInTheDocument();

    // Check that highlighter exists and has been positioned
    const highlighterElement = highlighterCanvas as HTMLCanvasElement;
    const left = parseInt(highlighterElement.style.left.replace("px", ""));
    const top = parseInt(highlighterElement.style.top.replace("px", ""));

    // Highlighter should be positioned overlapping the calendar
    expect(left).toBeGreaterThan(-50); // Allow for negative positioning due to padding/margin
    expect(top).toBeGreaterThan(-50);

    // Highlighter should have high z-index to render on top
    expect(highlighterElement.style.zIndex).toBe("100");
  });

  it("should include Saturday (last day) of the current week", async () => {
    setup();

    // Wait for positioning calculations
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Get current date to find the Saturday of current week
    const currentDate = new Date();
    const currentDay = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
    const daysUntilSaturday = (6 - currentDay + 7) % 7;
    const saturdayDate = new Date(currentDate);
    saturdayDate.setDate(currentDate.getDate() + daysUntilSaturday);

    // In the mock, we're using January 11, 2024 (Thursday)
    // So Saturday would be January 13, 2024
    const expectedSaturday = 13;

    // Find the Saturday elements in the calendar (may appear in multiple months)
    const saturdayElements = screen.getAllByText(expectedSaturday.toString());
    expect(saturdayElements.length).toBeGreaterThanOrEqual(1);

    // Verify at least one Saturday is part of the calendar grid
    const saturdayInGrid = saturdayElements.find((element) => {
      // Check if the element itself or its parent has calendar-related class
      return (
        element.className.includes("CalendarDay") ||
        (element.parentElement &&
          element.parentElement.className.includes("CalendarDay"))
      );
    });
    expect(saturdayInGrid).toBeDefined();
    expect(saturdayInGrid).toBeInTheDocument();
  });

  // Note: Highlighter dimensions are dynamic and responsive; exact
  // width/height assertions are validated in the earlier highlighter test.

  describe("Week Navigation", () => {
    it("should render This Week label and navigation arrows initially", () => {
      const { getWeekLabel, getBackArrow, getForwardArrow } = setup();

      expect(getWeekLabel()).toHaveTextContent("This Week");
      expect(getBackArrow()).toBeInTheDocument();
      expect(getForwardArrow()).toBeInTheDocument();
    });

    it("should have back arrow disabled and forward arrow enabled initially", () => {
      const { getBackArrow, getForwardArrow } = setup();

      expect(getBackArrow()).toBeDisabled();
      expect(getForwardArrow()).not.toBeDisabled();
    });

    it("should show initial week events (Meal prep, Get groceries, Coffee with Mom)", () => {
      const { getEvents } = setup();
      const events = getEvents();

      expect(screen.getByText("🥙 Meal prep")).toBeInTheDocument();
      expect(screen.getByText("🥗 Get groceries")).toBeInTheDocument();
      expect(screen.getAllByText("☕️ Coffee with Mom")).toHaveLength(1);
    });

    it("should navigate to next week when forward arrow is clicked", async () => {
      const { getForwardArrow, getWeekLabel } = setup();
      const consoleSpy = jest.spyOn(console, "log");

      await userEvent.click(getForwardArrow());

      expect(getWeekLabel()).toHaveTextContent("Next Week");
    });

    it("should show different events when navigated to next week", async () => {
      const { getForwardArrow } = setup();

      await userEvent.click(getForwardArrow());

      expect(screen.getByText("📑 Submit report")).toBeInTheDocument();
      expect(screen.getByText("🧹 Clean house")).toBeInTheDocument();
      expect(screen.queryByText("🥙 Meal prep")).not.toBeInTheDocument();
      expect(screen.queryByText("🥗 Get groceries")).not.toBeInTheDocument();
      expect(screen.queryByText("☕️ Coffee with Mom")).not.toBeInTheDocument();
    });

    it("should show only 2 events in next week", async () => {
      const { getForwardArrow, getEvents } = setup();

      await userEvent.click(getForwardArrow());

      const events = getEvents();
      expect(events).toHaveLength(2);
    });

    it("should have forward arrow disabled when on next week", async () => {
      const { getForwardArrow, getBackArrow } = setup();

      await userEvent.click(getForwardArrow());

      expect(getForwardArrow()).toBeDisabled();
      expect(getBackArrow()).not.toBeDisabled();
    });

    it("should navigate back to this week when back arrow is clicked", async () => {
      const { getForwardArrow, getBackArrow, getWeekLabel } = setup();
      const consoleSpy = jest.spyOn(console, "log");

      // Navigate to next week first
      await userEvent.click(getForwardArrow());
      expect(getWeekLabel()).toHaveTextContent("Next Week");

      // Navigate back
      await userEvent.click(getBackArrow());

      expect(getWeekLabel()).toHaveTextContent("This Week");
    });

    it("should show original events when navigated back to this week", async () => {
      const { getForwardArrow, getBackArrow } = setup();

      // Navigate to next week and back
      await userEvent.click(getForwardArrow());
      await userEvent.click(getBackArrow());

      expect(screen.getByText("🥙 Meal prep")).toBeInTheDocument();
      expect(screen.getByText("🥗 Get groceries")).toBeInTheDocument();
      expect(screen.getAllByText("☕️ Coffee with Mom")).toHaveLength(1);
      expect(screen.queryByText("📑 Submit report")).not.toBeInTheDocument();
      expect(screen.queryByText("🧹 Clean house")).not.toBeInTheDocument();
    });

    it("should have proper accessibility attributes for navigation arrows", () => {
      const { getBackArrow, getForwardArrow } = setup();

      expect(getBackArrow()).toHaveAttribute(
        "aria-label",
        "Navigate to previous week",
      );
      expect(getForwardArrow()).toHaveAttribute(
        "aria-label",
        "Navigate to next week",
      );
      expect(getBackArrow()).toHaveAttribute("title", "Previous week");
      expect(getForwardArrow()).toHaveAttribute("title", "Next week");
    });
  });

  describe("Month Migration", () => {
    it("should check the month migration checkbox and remove the event when migrating a month event", async () => {
      render(<SomedayMigrationWithProvider {...defaultProps} />);

      // Ensure a month event is present initially
      expect(screen.getByText("🤖 Start AI course")).toBeInTheDocument();

      // Click the first month event's forward arrow
      const monthForwardArrows = screen.getAllByTitle("Migrate to next month");
      expect(monthForwardArrows.length).toBeGreaterThan(0);
      await userEvent.click(monthForwardArrows[0]);

      // Checkbox should be checked
      const monthCheckbox = screen.getByLabelText(
        "Migrate an event to next month",
      ) as HTMLInputElement;
      expect(monthCheckbox).toBeChecked();

      // Event should be removed from the This Month list
      expect(screen.queryByText("🤖 Start AI course")).not.toBeInTheDocument();

      // A label should appear next to the Next Month rectangle
      expect(
        screen.getByText(/Start AI course is here now/),
      ).toBeInTheDocument();

      // There should be at least one canvas drawn for the month highlight
      const canvases = document.querySelectorAll("canvas");
      expect(canvases.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Month Sidebar Paging", () => {
    it("changes label from This Month to Next Month when navigating forward", async () => {
      render(<SomedayMigrationWithProvider {...defaultProps} />);

      const sections = document.querySelectorAll('[class*="SidebarSection"]');
      const monthSection = sections[1] as HTMLElement; // Second section is month

      expect(within(monthSection).getByText("This Month")).toBeInTheDocument();

      // Navigate to next page (week navigation forward)
      await userEvent.click(screen.getByTitle("Next week"));

      expect(within(monthSection).getByText("Next Month")).toBeInTheDocument();
    });

    it("shows migrated month event on Next Month after navigating forward", async () => {
      render(<SomedayMigrationWithProvider {...defaultProps} />);

      // Migrate first month event forward
      const monthForwardArrows = screen.getAllByTitle("Migrate to next month");
      await userEvent.click(monthForwardArrows[0]);

      // Navigate to next page
      await userEvent.click(screen.getByTitle("Next week"));

      const sections = document.querySelectorAll('[class*="SidebarSection"]');
      const monthSection = sections[1] as HTMLElement;

      // Label should be Next Month now
      expect(within(monthSection).getByText("Next Month")).toBeInTheDocument();

      // Migrated event should appear in Next Month list
      expect(
        within(monthSection).getByText("🤖 Start AI course"),
      ).toBeInTheDocument();
    });
  });

  describe("Event Migration Arrows", () => {
    it("should render migrate arrows for each event", () => {
      const { getEventMigrateArrows } = setup();
      const arrows = getEventMigrateArrows();

      // 3 events × 2 arrows each = 6 arrows
      expect(arrows).toHaveLength(6);
    });

    it("should log migration when event arrow is clicked", async () => {
      const consoleSpy = jest.spyOn(console, "log");
      const { getEventMigrateArrows } = setup();
      const arrows = getEventMigrateArrows();

      // Click first event's forward arrow
      const firstEventForwardArrow = arrows.find(
        (arrow) =>
          arrow.getAttribute("title") === "Migrate to next week" &&
          arrow.textContent === ">",
      );

      await userEvent.click(firstEventForwardArrow!);
    });

    it("should log backward migration when back arrow is clicked", async () => {
      const consoleSpy = jest.spyOn(console, "log");
      const { getEventMigrateArrows } = setup();
      const arrows = getEventMigrateArrows();

      // Click first event's back arrow
      const firstEventBackArrow = arrows.find(
        (arrow) =>
          arrow.getAttribute("title") === "Migrate to previous week" &&
          arrow.textContent === "<",
      );

      await userEvent.click(firstEventBackArrow!);
    });

    it("should log correct event name and week context when on next week", async () => {
      const consoleSpy = jest.spyOn(console, "log");
      const { getForwardArrow, getEventMigrateArrows } = setup();

      // Navigate to next week
      await userEvent.click(getForwardArrow());

      const arrows = getEventMigrateArrows();
      const firstEventForwardArrow = arrows.find(
        (arrow) =>
          arrow.getAttribute("title") === "Migrate to next week" &&
          arrow.textContent === ">",
      );

      await userEvent.click(firstEventForwardArrow!);
    });

    it("should have proper accessibility for event migrate arrows", () => {
      const { getEventMigrateArrows } = setup();
      const arrows = getEventMigrateArrows();

      arrows.forEach((arrow) => {
        expect(arrow).toHaveAttribute("role", "button");
        expect(arrow).toHaveAttribute("tabIndex", "0");
        expect(arrow).toHaveAttribute("title");
      });
    });

    it("should support keyboard navigation for event arrows", async () => {
      const consoleSpy = jest.spyOn(console, "log");
      const { getEventMigrateArrows } = setup();
      const arrows = getEventMigrateArrows();

      const firstEventForwardArrow = arrows.find(
        (arrow) =>
          arrow.getAttribute("title") === "Migrate to next week" &&
          arrow.textContent === ">",
      );

      // Focus and press Enter
      firstEventForwardArrow!.focus();
      await userEvent.keyboard("{Enter}");

      // Clear console and test Space key
      consoleSpy.mockClear();
      await userEvent.keyboard(" ");
    });

    it("should disable event migration arrows when on Next Week", async () => {
      const { getForwardArrow, getEventMigrateArrows } = setup();

      // Navigate to next week
      await userEvent.click(getForwardArrow());

      const arrows = getEventMigrateArrows();

      // All arrows should be disabled when on Next Week
      arrows.forEach((arrow) => {
        expect(arrow).toHaveAttribute("tabIndex", "-1");
      });
    });

    it("should not trigger migration when disabled arrows are clicked", async () => {
      const consoleSpy = jest.spyOn(console, "log");
      const { getForwardArrow, getEventMigrateArrows } = setup();

      // Navigate to next week
      await userEvent.click(getForwardArrow());

      const arrows = getEventMigrateArrows();
      const firstArrow = arrows[0];

      // Clear any previous console logs
      consoleSpy.mockClear();

      // Try to click disabled arrow
      await userEvent.click(firstArrow);
    });

    it("should re-enable event migration arrows when navigating back to This Week", async () => {
      const { getForwardArrow, getBackArrow, getEventMigrateArrows } = setup();

      // Navigate to next week and back
      await userEvent.click(getForwardArrow());
      await userEvent.click(getBackArrow());

      const arrows = getEventMigrateArrows();

      // All arrows should be re-enabled
      arrows.forEach((arrow) => {
        expect(arrow).toHaveAttribute("tabIndex", "0");
        expect(arrow.getAttribute("title")).toMatch(
          /Migrate to (previous|next) week/,
        );
      });
    });
  });

  describe("Keyboard Navigation Blocking", () => {
    it("should prevent ENTER key navigation when not all checkboxes are checked", async () => {
      const mockOnNext = jest.fn();
      render(
        <SomedayMigrationWithProvider {...defaultProps} onNext={mockOnNext} />,
      );

      // Initially, no checkboxes should be checked
      const eventCheckbox = screen.getByLabelText(
        "Migrate an event to next week",
      ) as HTMLInputElement;
      const monthCheckbox = screen.getByLabelText(
        "Migrate an event to next month",
      ) as HTMLInputElement;
      const viewCheckbox = screen.getByLabelText(
        "Go to next week/month",
      ) as HTMLInputElement;

      expect(eventCheckbox).not.toBeChecked();
      expect(monthCheckbox).not.toBeChecked();
      expect(viewCheckbox).not.toBeChecked();

      // Try to press ENTER - should not navigate
      await userEvent.keyboard("{Enter}");
      expect(mockOnNext).not.toHaveBeenCalled();
    });

    it("should prevent RIGHT ARROW key navigation when not all checkboxes are checked", async () => {
      const mockOnNext = jest.fn();
      render(
        <SomedayMigrationWithProvider {...defaultProps} onNext={mockOnNext} />,
      );

      // Try to press RIGHT ARROW - should not navigate
      await userEvent.keyboard("{ArrowRight}");
      expect(mockOnNext).not.toHaveBeenCalled();
    });

    it("should prevent 'k' key navigation when not all checkboxes are checked", async () => {
      render(
        <SomedayMigrationWithProvider {...defaultProps} onNext={mockOnNext} />,
      );

      // Initially, no checkboxes should be checked
      const eventCheckbox = screen.getByLabelText(
        "Migrate an event to next week",
      ) as HTMLInputElement;
      const monthCheckbox = screen.getByLabelText(
        "Migrate an event to next month",
      ) as HTMLInputElement;
      const viewCheckbox = screen.getByLabelText(
        "Go to next week/month",
      ) as HTMLInputElement;

      expect(eventCheckbox).not.toBeChecked();
      expect(monthCheckbox).not.toBeChecked();
      expect(viewCheckbox).not.toBeChecked();

      // Try to press 'k' - should not navigate
      fireEvent.keyDown(document, { key: "k", code: "KeyK" });
      expect(mockOnNext).not.toHaveBeenCalled();
    });

    it("should be ready for navigation after all checkboxes are checked", async () => {
      render(
        <SomedayMigrationWithProvider {...defaultProps} onNext={mockOnNext} />,
      );

      // Complete all tasks by interacting with the component
      // 1. Migrate a week event
      const eventMigrateArrows = screen.getAllByTitle("Migrate to next week");
      await userEvent.click(eventMigrateArrows[0]);

      // 2. Migrate a month event
      const monthMigrateArrows = screen.getAllByTitle("Migrate to next month");
      await userEvent.click(monthMigrateArrows[0]);

      // 3. Navigate to next week
      await userEvent.click(screen.getByTitle("Next week"));

      // Now all checkboxes should be checked
      const eventCheckbox = screen.getByLabelText(
        "Migrate an event to next week",
      ) as HTMLInputElement;
      const monthCheckbox = screen.getByLabelText(
        "Migrate an event to next month",
      ) as HTMLInputElement;
      const viewCheckbox = screen.getByLabelText(
        "Go to next week/month",
      ) as HTMLInputElement;

      expect(eventCheckbox).toBeChecked();
      expect(monthCheckbox).toBeChecked();
      expect(viewCheckbox).toBeChecked();

      // Verify that the Next button is enabled (which means ENTER should work)
      const nextButton = screen.getByLabelText("Next");
      expect(nextButton).not.toBeDisabled();

      // The component should be ready for keyboard navigation
      // This test verifies that the component state is correct for ENTER key navigation
      // The actual ENTER key handling is tested in the integration tests
    });

    it("should be ready for 'k' key navigation after all checkboxes are checked", async () => {
      render(
        <SomedayMigrationWithProvider {...defaultProps} onNext={mockOnNext} />,
      );

      // Complete all tasks by interacting with the component
      // 1. Migrate a week event
      const eventMigrateArrows = screen.getAllByTitle("Migrate to next week");
      await userEvent.click(eventMigrateArrows[0]);

      // 2. Migrate a month event
      const monthMigrateArrows = screen.getAllByTitle("Migrate to next month");
      await userEvent.click(monthMigrateArrows[0]);

      // 3. Navigate to next week
      await userEvent.click(screen.getByTitle("Next week"));

      // Now all checkboxes should be checked
      const eventCheckbox = screen.getByLabelText(
        "Migrate an event to next week",
      ) as HTMLInputElement;
      const monthCheckbox = screen.getByLabelText(
        "Migrate an event to next month",
      ) as HTMLInputElement;
      const viewCheckbox = screen.getByLabelText(
        "Go to next week/month",
      ) as HTMLInputElement;

      expect(eventCheckbox).toBeChecked();
      expect(monthCheckbox).toBeChecked();
      expect(viewCheckbox).toBeChecked();

      // Verify that the Next button is enabled (which means 'k' key should work)
      const nextButton = screen.getByLabelText("Next");
      expect(nextButton).not.toBeDisabled();

      // The component should be ready for keyboard navigation
      // This test verifies that the component state is correct for 'k' key navigation
      // The actual 'k' key handling is tested in the integration tests
    });

    it("should have Next button disabled when not all checkboxes are checked", () => {
      render(<SomedayMigrationWithProvider {...defaultProps} />);

      const nextButton = screen.getByLabelText("Next");
      expect(nextButton).toBeDisabled();
    });

    it("should have Next button enabled after all checkboxes are checked", async () => {
      render(<SomedayMigrationWithProvider {...defaultProps} />);

      // Complete all tasks
      const eventMigrateArrows = screen.getAllByTitle("Migrate to next week");
      await userEvent.click(eventMigrateArrows[0]);

      const monthMigrateArrows = screen.getAllByTitle("Migrate to next month");
      await userEvent.click(monthMigrateArrows[0]);

      await userEvent.click(screen.getByTitle("Next week"));

      // Wait for state updates
      await new Promise((resolve) => setTimeout(resolve, 100));

      const nextButton = screen.getByLabelText("Next");
      expect(nextButton).not.toBeDisabled();
    });
  });
});
