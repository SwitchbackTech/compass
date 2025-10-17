import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { TaskProvider } from "../../context/TaskProvider";
import { Tasks } from "./Tasks";

const renderTasks = () => {
  return render(
    <TaskProvider>
      <Tasks />
    </TaskProvider>,
  );
};

describe("Tasks Tab Navigation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render empty state initially", () => {
    renderTasks();

    // Initially no tasks should be visible
    const checkboxes = screen.queryAllByRole("checkbox");
    const textboxes = screen.queryAllByRole("textbox");
    expect(checkboxes).toHaveLength(0);
    expect(textboxes).toHaveLength(0);
  });

  it("should render the tasks container", () => {
    renderTasks();

    // Verify the component renders without errors by checking for the container div
    const container = document.querySelector(".space-y-3");
    expect(container).toBeInTheDocument();
  });
});
