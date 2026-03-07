import "@testing-library/jest-dom";
import { screen, within } from "@testing-library/react";
import { prepareEmptyStorageForTests } from "@web/__tests__/utils/storage/indexeddb.test.util";
import { waitForTaskListReady } from "@web/__tests__/utils/tasks/task.test.util";
import { getModifierKeyTestId } from "@web/common/utils/shortcut/shortcut.util";
import { renderWithDayProvidersAsync } from "@web/views/Day/util/day.test-util";
import { DayViewContent } from "@web/views/Day/view/DayViewContent";

describe("DayView", () => {
  beforeEach(async () => {
    await prepareEmptyStorageForTests();
  });

  it("should render TaskList component", async () => {
    await renderWithDayProvidersAsync(<DayViewContent />);
    await waitForTaskListReady();

    const taskpanel = await screen.findByRole("region", {
      name: "daily-tasks",
    });

    expect(within(taskpanel).getByText("Create task")).toBeInTheDocument();
  });

  it("should render CalendarAgenda component", async () => {
    await renderWithDayProvidersAsync(<DayViewContent />);
    await waitForTaskListReady();

    expect(await screen.findByTestId("calendar-scroll")).toBeInTheDocument();
  });

  it("should render command palette shortcut", async () => {
    await renderWithDayProvidersAsync(<DayViewContent />);
    await waitForTaskListReady();

    // Check that CMD+K shortcut is displayed in the shortcuts overlay
    expect(await screen.findByText("Global")).toBeInTheDocument();
    expect(screen.getByTestId(getModifierKeyTestId())).toBeInTheDocument();
    expect(screen.getAllByTestId("k-icon").length).toBeGreaterThan(1);
    expect(screen.getByText("Command Palette")).toBeInTheDocument();
  });
});
