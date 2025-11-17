import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { renderWithDayProviders } from "../../util/day.test-util";
import { Tasks } from "./Tasks";

describe("Tasks Tab Navigation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render empty state initially", async () => {
    renderWithDayProviders(<Tasks />);

    // Initially no tasks should be visible
    await expect(screen.findAllByRole("checkbox")).rejects.toThrow();
    await expect(screen.findAllByRole("textbox")).rejects.toThrow();
  });

  it("should render the tasks container", async () => {
    renderWithDayProviders(<Tasks />);

    // Verify the component renders without errors by checking for the container div
    await waitFor(() => {
      const container = document.querySelector(".space-y-3");
      expect(container).toBeInTheDocument();
    });
  });
});
