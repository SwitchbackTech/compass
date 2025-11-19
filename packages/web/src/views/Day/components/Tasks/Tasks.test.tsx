import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { DNDTasksProvider } from "../../context/DNDTasksProvider";
import { renderWithDayProviders } from "../../util/day.test-util";
import { Tasks } from "./Tasks";

describe("Tasks Tab Navigation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render empty state initially", async () => {
    renderWithDayProviders(
      <DNDTasksProvider>
        <Tasks />
      </DNDTasksProvider>,
    );

    // Initially no tasks should be visible
    await expect(screen.findAllByRole("checkbox")).rejects.toThrow();
    await expect(screen.findAllByRole("textbox")).rejects.toThrow();
  });

  it("should render the tasks container", async () => {
    renderWithDayProviders(
      <DNDTasksProvider>
        <Tasks />
      </DNDTasksProvider>,
    );

    // Verify the component renders without errors by checking for the container div
    await waitFor(() => {
      const container = document.querySelector("#task-list-drop-zone");
      expect(container).toBeInTheDocument();
    });
  });
});
