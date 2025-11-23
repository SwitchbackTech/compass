import "@testing-library/jest-dom";
import { screen, within } from "@testing-library/react";
import { renderWithDayProviders } from "@web/views/Day/util/day.test-util";
import { DayViewContent } from "@web/views/Day/view/DayViewContent";

describe("DayView", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render TaskList component", async () => {
    renderWithDayProviders(<DayViewContent />);

    const taskpanel = await screen.findByRole("region", {
      name: "daily-tasks",
    });

    expect(within(taskpanel).getByText("Create task")).toBeInTheDocument();
  });

  it("should render CalendarAgenda component", async () => {
    renderWithDayProviders(<DayViewContent />);

    expect(await screen.findByTestId("calendar-scroll")).toBeInTheDocument();
  });

  it("should render command palette shortcut", async () => {
    renderWithDayProviders(<DayViewContent />);

    // Check that CMD+K shortcut is displayed in the shortcuts overlay
    expect(screen.getByText("⌘K")).toBeInTheDocument();
    expect(screen.getByText("Command Palette")).toBeInTheDocument();
  });
});
