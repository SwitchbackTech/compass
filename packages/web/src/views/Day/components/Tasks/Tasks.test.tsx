import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { renderWithDayProviders } from "../../util/day.test-util";
import { Tasks } from "./Tasks";

describe("Tasks Tab Navigation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render empty state initially", () => {
    renderWithDayProviders(<Tasks />);

    // Initially no tasks should be visible
    const checkboxes = screen.queryAllByRole("checkbox");
    const textboxes = screen.queryAllByRole("textbox");
    expect(checkboxes).toHaveLength(0);
    expect(textboxes).toHaveLength(0);
  });

  it("should render the tasks container", () => {
    renderWithDayProviders(<Tasks />);

    // Verify the component renders without errors by checking for the container div
    const container = document.querySelector(".space-y-3");
    expect(container).toBeInTheDocument();
  });
});
