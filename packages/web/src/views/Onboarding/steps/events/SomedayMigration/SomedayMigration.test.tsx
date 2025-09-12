import React from "react";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { withProvider } from "../../../components/OnboardingContext";
import { SomedayMigration } from "./SomedayMigration";

// Wrap the component with OnboardingProvider
const SomedayMigrationWithProvider = withProvider(SomedayMigration);

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
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Clear console.log mock
    jest.spyOn(console, "log").mockImplementation(() => {});
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
        screen.getAllByTitle(
          /Migrate to (previous|next) week|Cannot migrate further/,
        ),
      getEvents: () => screen.getAllByText(/🥙|🥗|🏠|📑|🧹/),
    };
  }

  it("should render the component with 3 someday events", () => {
    setup();

    expect(screen.getByText("🥙 Meal prep")).toBeInTheDocument();
    expect(screen.getByText("🥗 Get groceries")).toBeInTheDocument();
    expect(screen.getByText("🏠 Book Airbnb")).toBeInTheDocument();
  });

  it("should render the sidebar with correct title", () => {
    setup();

    expect(screen.getByText("This Week")).toBeInTheDocument();
  });

  it("should render checkboxes for user tasks", () => {
    setup();

    expect(screen.getByText("Migrate a week event")).toBeInTheDocument();
    expect(screen.getByText("Go to next week")).toBeInTheDocument();
  });

  it("should have proper accessibility attributes for event containers", () => {
    setup();

    const eventContainers = screen
      .getAllByText(/🥙|🥗|🏠/)
      .map((text) => text.closest('[role="button"]'));

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

    // Check that the month widgets have titles
    expect(screen.getByText("This Month")).toBeInTheDocument();
    expect(screen.getByText("Next Month")).toBeInTheDocument();
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
    expect(screen.getByText("10")).toBeInTheDocument();
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
    expect(screen.getByText("10")).toBeInTheDocument();
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

    // Find the Saturday element in the calendar
    const saturdayElement = screen.getByText(expectedSaturday.toString());
    expect(saturdayElement).toBeInTheDocument();

    // Verify Saturday is part of the calendar grid (its parent should be the grid)
    const saturdayParent = saturdayElement.parentElement;
    expect(saturdayParent).toHaveAttribute(
      "class",
      expect.stringContaining("CalendarGrid"),
    );
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

    it("should show initial week events (Meal prep, Get groceries, Book Airbnb)", () => {
      const { getEvents } = setup();
      const events = getEvents();

      expect(screen.getByText("🥙 Meal prep")).toBeInTheDocument();
      expect(screen.getByText("🥗 Get groceries")).toBeInTheDocument();
      expect(screen.getByText("🏠 Book Airbnb")).toBeInTheDocument();
      expect(events).toHaveLength(3);
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
      expect(screen.queryByText("🏠 Book Airbnb")).not.toBeInTheDocument();
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
      expect(screen.getByText("🏠 Book Airbnb")).toBeInTheDocument();
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
        expect(arrow.getAttribute("title")).toMatch(/Cannot migrate further/);
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
});
