import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { Schema_WebEvent } from "@web/common/types/web.event.types";
import * as useTodayEventsHook from "@web/views/Day/hooks/events/useTodayEvents";
import { NowView } from "./NowView";

// Mock the useNowShortcuts hook
jest.mock("./useNowShortcuts", () => ({
  useNowShortcuts: jest.fn(),
}));

describe("NowView", () => {
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

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it("renders the shortcuts overlay", () => {
    const useTodayEventsSpy = jest.spyOn(useTodayEventsHook, "useTodayEvents");
    useTodayEventsSpy.mockReturnValue([]);

    render(<NowView />);

    expect(
      screen.getByRole("complementary", { name: "Shortcut overlay" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Shortcuts")).toBeInTheDocument();

    useTodayEventsSpy.mockRestore();
  });

  it("renders global shortcuts", () => {
    const useTodayEventsSpy = jest.spyOn(useTodayEventsHook, "useTodayEvents");
    useTodayEventsSpy.mockReturnValue([]);

    render(<NowView />);

    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.getByText("Now")).toBeInTheDocument();
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getByText("Week")).toBeInTheDocument();

    useTodayEventsSpy.mockRestore();
  });

  it("renders shortcut keys correctly", () => {
    const useTodayEventsSpy = jest.spyOn(useTodayEventsHook, "useTodayEvents");
    useTodayEventsSpy.mockReturnValue([]);

    render(<NowView />);

    // Check that shortcut keys are rendered
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    useTodayEventsSpy.mockRestore();
  });

  it("renders the main content", () => {
    const useTodayEventsSpy = jest.spyOn(useTodayEventsHook, "useTodayEvents");
    useTodayEventsSpy.mockReturnValue([]);

    render(<NowView />);

    expect(screen.getByText("Now View - Coming Soon")).toBeInTheDocument();

    useTodayEventsSpy.mockRestore();
  });

  it("renders UpcomingEvent component with no events message when no events exist", () => {
    const useTodayEventsSpy = jest.spyOn(useTodayEventsHook, "useTodayEvents");
    useTodayEventsSpy.mockReturnValue([]);

    render(<NowView />);

    expect(
      screen.getByText("No more events today. Lock in"),
    ).toBeInTheDocument();

    useTodayEventsSpy.mockRestore();
  });

  it("renders UpcomingEvent component with event information when events exist", async () => {
    const events: useTodayEventsHook.TodayEvent[] = [
      {
        id: mockEvent._id ?? "",
        title: mockEvent.title ?? "",
        startTime: new Date(mockEvent.startDate!),
        endTime: new Date(mockEvent.endDate!),
        isAllDay: false,
      },
    ];

    const useTodayEventsSpy = jest.spyOn(useTodayEventsHook, "useTodayEvents");
    useTodayEventsSpy.mockReturnValue(events);

    const { findByText } = render(<NowView />);

    // The UpcomingEvent component should show the event title (use findBy for async)
    expect(await findByText("Team Meeting")).toBeInTheDocument();

    useTodayEventsSpy.mockRestore();
  });
});
