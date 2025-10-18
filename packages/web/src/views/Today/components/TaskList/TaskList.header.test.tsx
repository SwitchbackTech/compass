import React, { act } from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "@core/util/date/dayjs";
import { render } from "../../../../__tests__/__mocks__/mock.render";
import { TaskProvider } from "../../context/TaskProvider";
import { TaskList } from "./TaskList";
import { HEADING_FORMAT } from "./TaskListHeader";

const renderTaskList = (props = {}, currentDate?: Date) => {
  const user = userEvent.setup();
  const result = render(
    <TaskProvider currentDate={currentDate}>
      <TaskList {...props} />
    </TaskProvider>,
  );
  return { ...result, user };
};

// format dates using the same format as the component
const format = (date: Date) => {
  return dayjs(date).locale("en").format(HEADING_FORMAT);
};

describe("TaskListHeader", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render the today heading with current date", () => {
    renderTaskList();

    const heading = screen.getByRole("heading", { level: 2 });
    const subheading = screen.getByRole("heading", { level: 3 });
    expect(heading).toBeInTheDocument();
    expect(subheading).toBeInTheDocument();
    expect(heading.textContent).toMatch(/\w+/); // Matches format like "Wednesday"
    expect(subheading.textContent).toMatch(/\w+ \d+/); // Matches format like "January 15"
  });

  it("should navigate to next day when clicking next day button", async () => {
    const testDate = new Date("2025-01-15T12:00:00Z");
    const { user } = renderTaskList({}, testDate);

    // Verify initial heading shows correct date
    const heading = screen.getByRole("heading", { level: 2 });
    const expectedInitialDate = format(testDate);
    expect(heading).toHaveTextContent(expectedInitialDate);

    // Click the next day button
    const nextButton = screen.getByRole("button", { name: "Next day" });
    await act(async () => {
      await user.click(nextButton);
    });

    // Verify heading updates to next day
    const expectedNextDate = format(dayjs(testDate).add(1, "day").toDate());
    await waitFor(() => {
      expect(heading).toHaveTextContent(expectedNextDate);
    });
  });

  it("should navigate to previous day when clicking previous day button", async () => {
    const testDate = new Date("2025-01-15T12:00:00Z");
    const { user } = renderTaskList({}, testDate);

    // Verify initial heading shows correct date
    const heading = screen.getByRole("heading", { level: 2 });
    const expectedInitialDate = format(testDate);
    expect(heading).toHaveTextContent(expectedInitialDate);

    // Click the previous day button
    const prevButton = screen.getByRole("button", { name: "Previous day" });
    await act(async () => {
      await user.click(prevButton);
    });

    // Verify heading updates to previous day
    const expectedPrevDate = format(
      dayjs(testDate).subtract(1, "day").toDate(),
    );
    await waitFor(() => {
      expect(heading).toHaveTextContent(expectedPrevDate);
    });
  });

  it("should handle multiple navigation clicks correctly", async () => {
    const testDate = new Date("2025-01-15T12:00:00Z");
    const { user } = renderTaskList({}, testDate);

    const heading = screen.getByRole("heading", { level: 2 });
    const nextButton = screen.getByRole("button", { name: "Next day" });
    const prevButton = screen.getByRole("button", { name: "Previous day" });

    // Click next day twice
    await act(async () => {
      await user.click(nextButton);
    });
    const expectedAfterFirstNext = format(
      dayjs(testDate).add(1, "day").toDate(),
    );
    await waitFor(() => {
      expect(heading).toHaveTextContent(expectedAfterFirstNext);
    });

    await act(async () => {
      await user.click(nextButton);
    });
    const expectedAfterSecondNext = format(
      dayjs(testDate).add(2, "day").toDate(),
    );
    await waitFor(() => {
      expect(heading).toHaveTextContent(expectedAfterSecondNext);
    });

    // Click previous day once
    await act(async () => {
      await user.click(prevButton);
    });
    const expectedAfterPrev = format(dayjs(testDate).add(1, "day").toDate());
    await waitFor(() => {
      expect(heading).toHaveTextContent(expectedAfterPrev);
    });
  });

  it("should navigate across month boundary correctly", async () => {
    const testDate = new Date("2025-01-31T12:00:00Z");
    const { user } = renderTaskList({}, testDate);

    const heading = screen.getByRole("heading", { level: 2 });
    const nextButton = screen.getByRole("button", { name: "Next day" });

    // Verify initial date is end of January
    const initialDate = format(testDate);
    expect(heading).toHaveTextContent(initialDate);

    // Click next day to go to February
    await act(async () => {
      await user.click(nextButton);
    });

    // Verify heading shows February 1st
    const nextDate = format(dayjs(testDate).add(1, "day").toDate());
    await waitFor(() => {
      expect(heading).toHaveTextContent(nextDate);
    });
  });

  it("should show go to today button when viewing a different day", () => {
    const testDate = new Date("2025-01-15T12:00:00Z");
    renderTaskList({}, testDate);

    const goToTodayButton = screen.getByRole("button", { name: "Go to today" });
    expect(goToTodayButton).toBeInTheDocument();
  });

  it("should not show go to today button when viewing today", () => {
    renderTaskList();

    const goToTodayButton = screen.getByLabelText("Go to today");
    expect(goToTodayButton).toBeInTheDocument();

    // Check that the wrapper div has the invisible class
    // The invisible class is on the parent div that wraps the TooltipWrapper
    const wrapperDiv = goToTodayButton?.parentElement?.parentElement;
    expect(wrapperDiv).toHaveClass("invisible");
  });

  it("should navigate to today when clicking go to today button", async () => {
    const testDate = new Date("2025-01-15T12:00:00Z");
    const { user } = renderTaskList({}, testDate);

    const heading = screen.getByRole("heading", { level: 2 });
    const goToTodayButton = screen.getByRole("button", { name: "Go to today" });

    // Verify initial heading shows the test date
    const expectedInitialDate = format(testDate);
    expect(heading).toHaveTextContent(expectedInitialDate);

    // Click the go to today button
    await act(async () => {
      await user.click(goToTodayButton);
    });

    // Verify heading updates to today's date
    const expectedTodayDate = format(dayjs().toDate());
    await waitFor(() => {
      expect(heading).toHaveTextContent(expectedTodayDate);
    });
  });
});
