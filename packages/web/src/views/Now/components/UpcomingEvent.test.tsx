import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { Schema_WebEvent } from "@web/common/types/web.event.types";
import { UpcomingEvent } from "./UpcomingEvent";

describe("UpcomingEvent", () => {
  const start = dayjs().add(1, "hour");
  const mockEvent: Schema_WebEvent = {
    ...createMockStandaloneEvent({}),
    origin: Origin.COMPASS,
    user: "test-user",
    priority: Priorities.RELATIONS,
    title: "Team Meeting",
    startDate: start.toISOString(),
    endDate: start.add(1, "hour").toISOString(),
  };

  describe("when no event and no starts time", () => {
    it("displays the 'no more events today' message", () => {
      render(<UpcomingEvent event={null} starts={undefined} />);

      expect(
        screen.getByText("No more events today. Lock in"),
      ).toBeInTheDocument();
    });

    it("renders with accessible label", () => {
      render(<UpcomingEvent event={null} starts={undefined} />);

      expect(
        screen.getByRole("complementary", { name: "Upcoming event" }),
      ).toBeInTheDocument();
    });

    it("renders coffee icon for no events message", () => {
      const { container } = render(
        <UpcomingEvent event={null} starts={undefined} />,
      );

      // Check for the Coffee icon - phosphor icons render as SVG
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("when no event but has starts time", () => {
    it("displays loading state", () => {
      render(<UpcomingEvent event={undefined} starts="in 5 minutes" />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("renders clock icon for loading state", () => {
      const { container } = render(
        <UpcomingEvent event={undefined} starts="in 5 minutes" />,
      );

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("when event exists", () => {
    it("displays event title", () => {
      render(<UpcomingEvent event={mockEvent} starts="in 1 hour" />);

      expect(screen.getByText("Team Meeting")).toBeInTheDocument();
    });

    it("displays starts time", () => {
      render(<UpcomingEvent event={mockEvent} starts="in 1 hour" />);

      expect(screen.getByText("Starts in 1 hour")).toBeInTheDocument();
    });

    it("displays 'Untitled Event' when title is missing", () => {
      const eventWithoutTitle = { ...mockEvent, title: undefined };
      render(<UpcomingEvent event={eventWithoutTitle} starts="in 1 hour" />);

      expect(screen.getByText("Untitled Event")).toBeInTheDocument();
    });

    it("renders without starts time if not provided", () => {
      render(<UpcomingEvent event={mockEvent} starts={undefined} />);

      expect(screen.getByText("Team Meeting")).toBeInTheDocument();
      expect(screen.queryByText(/Starts/)).not.toBeInTheDocument();
    });

    it("renders accessible label", () => {
      render(<UpcomingEvent event={mockEvent} starts="in 1 hour" />);

      expect(
        screen.getByRole("complementary", { name: "Upcoming event" }),
      ).toBeInTheDocument();
    });

    it("has live region for time updates", () => {
      render(<UpcomingEvent event={mockEvent} starts="in 1 hour" />);

      const timeElement = screen.getByText("Starts in 1 hour");
      expect(timeElement).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("urgency styling", () => {
    it("applies immediate urgency styles when starts contains 'second'", () => {
      const { container } = render(
        <UpcomingEvent event={mockEvent} starts="in a few seconds" />,
      );

      // Check for red color classes (immediate urgency)
      const aside = container.querySelector("aside");
      expect(aside?.className).toContain("border-red-400/40");
    });

    it("applies urgent styles when starts contains 'minute'", () => {
      const { container } = render(
        <UpcomingEvent event={mockEvent} starts="in 5 minutes" />,
      );

      // Check for amber color classes (urgent)
      const aside = container.querySelector("aside");
      expect(aside?.className).toContain("border-amber-400/40");
    });

    it("applies normal styles when not urgent", () => {
      const { container } = render(
        <UpcomingEvent event={mockEvent} starts="in 1 hour" />,
      );

      // Check for blue color classes (normal)
      const aside = container.querySelector("aside");
      expect(aside?.className).toContain("border-blue-400/30");
    });
  });

  describe("responsive design", () => {
    it("has responsive max-width classes", () => {
      const { container } = render(
        <UpcomingEvent event={mockEvent} starts="in 1 hour" />,
      );

      const aside = container.querySelector("aside");
      expect(aside?.className).toContain("max-w-xs");
      expect(aside?.className).toContain("md:max-w-sm");
    });

    it("has fixed positioning at top right", () => {
      const { container } = render(
        <UpcomingEvent event={mockEvent} starts="in 1 hour" />,
      );

      const aside = container.querySelector("aside");
      expect(aside?.className).toContain("fixed");
      expect(aside?.className).toContain("top-4");
      expect(aside?.className).toContain("right-4");
    });

    it("has appropriate z-index to avoid overlay conflicts", () => {
      const { container } = render(
        <UpcomingEvent event={mockEvent} starts="in 1 hour" />,
      );

      const aside = container.querySelector("aside");
      expect(aside?.className).toContain("z-30");
    });
  });
});
