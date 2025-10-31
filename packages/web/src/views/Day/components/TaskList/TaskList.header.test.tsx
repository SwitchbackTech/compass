import { act } from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "@core/util/date/dayjs";
import { renderWithDayProviders } from "../../util/day.test-util";
import { TaskList } from "./TaskList";
import { DAY_HEADING_FORMAT, DAY_SUBHEADING_FORMAT } from "./TaskListHeader";

const renderTaskList = (props = {}, currentDate?: Date) => {
  const user = userEvent.setup();
  const initialDate = currentDate ? dayjs(currentDate).utc() : dayjs().utc();
  const result = renderWithDayProviders(<TaskList {...props} />, {
    initialDate,
  });
  return { ...result, user };
};

// format dates using the same format as the component (UTC to match component behavior)
const format = (date: Date) => {
  return dayjs(date).utc().locale("en").format(DAY_HEADING_FORMAT);
};

const createUtcDate = (input: Date | string, dayOffset = 0) => {
  let utcDate = dayjs(input).utc();
  if (dayOffset !== 0) {
    utcDate = utcDate.add(dayOffset, "day");
  }
  return utcDate.toDate();
};

describe("TaskListHeader", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render the today heading with current date", () => {
    renderTaskList();

    const headingButton = screen.getByRole("button", {
      name: (content, element) => {
        // Match the button with aria-haspopup="listbox" which is the SelectView button
        return (
          element?.getAttribute("aria-haspopup") === "listbox" &&
          element?.textContent?.match(/\w+/) !== null
        );
      },
    });
    const subheading = screen.getByRole("heading", { level: 3 });
    expect(headingButton).toBeInTheDocument();
    expect(subheading).toBeInTheDocument();
    expect(headingButton.textContent).toMatch(/\w+/); // Matches format like "Wednesday"
    expect(subheading.textContent).toMatch(/\w+ \d+/); // Matches format like "January 15"
  });

  it("should navigate to next day when clicking next day button", async () => {
    const testDate = createUtcDate("2025-01-15T12:00:00Z");
    const { user } = renderTaskList({}, testDate);

    // Verify initial heading shows correct date
    const expectedInitialDate = format(testDate);
    const headingButton = screen.getByRole("button", {
      name: expectedInitialDate,
    });
    expect(headingButton).toHaveTextContent(expectedInitialDate);

    // Click the next day button
    const nextButton = screen.getByRole("button", { name: "Next day" });
    await act(async () => {
      await user.click(nextButton);
    });

    // Verify heading updates to next day
    const expectedNextDate = format(createUtcDate(testDate, 1));
    await waitFor(() => {
      expect(headingButton).toHaveTextContent(expectedNextDate);
    });
  });

  it("should navigate to previous day when clicking previous day button", async () => {
    const testDate = createUtcDate("2025-01-15T12:00:00Z");
    const { user } = renderTaskList({}, testDate);

    // Verify initial heading shows correct date
    const expectedInitialDate = format(testDate);
    const headingButton = screen.getByRole("button", {
      name: expectedInitialDate,
    });
    expect(headingButton).toHaveTextContent(expectedInitialDate);

    // Click the previous day button
    const prevButton = screen.getByRole("button", { name: "Previous day" });
    await act(async () => {
      await user.click(prevButton);
    });

    // Verify heading updates to previous day
    const expectedPrevDate = format(createUtcDate(testDate, -1));
    await waitFor(() => {
      expect(headingButton).toHaveTextContent(expectedPrevDate);
    });
  });

  it("should handle multiple navigation clicks correctly", async () => {
    const testDate = createUtcDate("2025-01-15T12:00:00Z");
    const { user } = renderTaskList({}, testDate);

    const expectedInitialDate = format(testDate);
    const headingButton = screen.getByRole("button", {
      name: expectedInitialDate,
    });
    const nextButton = screen.getByRole("button", { name: "Next day" });
    const prevButton = screen.getByRole("button", { name: "Previous day" });

    // Click next day twice
    await act(async () => {
      await user.click(nextButton);
    });
    const expectedAfterFirstNext = format(createUtcDate(testDate, 1));
    await waitFor(() => {
      expect(headingButton).toHaveTextContent(expectedAfterFirstNext);
    });

    await act(async () => {
      await user.click(nextButton);
    });
    const expectedAfterSecondNext = format(createUtcDate(testDate, 2));
    await waitFor(() => {
      expect(headingButton).toHaveTextContent(expectedAfterSecondNext);
    });

    // Click previous day once
    await act(async () => {
      await user.click(prevButton);
    });
    const expectedAfterPrev = format(createUtcDate(testDate, 1));
    await waitFor(() => {
      expect(headingButton).toHaveTextContent(expectedAfterPrev);
    });
  });

  it("should navigate across month boundary correctly", async () => {
    const testDate = createUtcDate("2025-01-31T12:00:00Z");
    const { user } = renderTaskList({}, testDate);

    const initialDate = format(testDate);
    const headingButton = screen.getByRole("button", { name: initialDate });
    const nextButton = screen.getByRole("button", { name: "Next day" });

    // Verify initial date is end of January
    expect(headingButton).toHaveTextContent(initialDate);

    // Click next day to go to February
    await act(async () => {
      await user.click(nextButton);
    });

    // Verify heading shows February 1st
    const nextDate = format(createUtcDate(testDate, 1));
    await waitFor(() => {
      expect(headingButton).toHaveTextContent(nextDate);
    });
  });

  it("should show go to today button when viewing a different day", () => {
    const testDate = createUtcDate("2025-01-15T12:00:00Z");
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
    const testDate = createUtcDate("2025-01-15T12:00:00Z");
    const { user } = renderTaskList({}, testDate);

    const expectedInitialDate = format(testDate);
    const headingButton = screen.getByRole("button", {
      name: expectedInitialDate,
    });
    const goToTodayButton = screen.getByRole("button", { name: "Go to today" });

    // Verify initial heading shows the test date
    expect(headingButton).toHaveTextContent(expectedInitialDate);

    // Click the go to today button
    await act(async () => {
      await user.click(goToTodayButton);
    });

    // Verify heading updates to today's date
    const expectedTodayDate = format(createUtcDate(new Date()));
    await waitFor(() => {
      expect(headingButton).toHaveTextContent(expectedTodayDate);
    });
  });

  it("should hide go to today button after navigating to today from a different day", async () => {
    const testDate = createUtcDate("2025-01-15T12:00:00Z");
    const { user } = renderTaskList({}, testDate);

    // Verify the go to today button is initially visible
    const goToTodayButton = screen.getByRole("button", { name: "Go to today" });
    expect(goToTodayButton).toBeInTheDocument();

    // Check that the wrapper div does NOT have the invisible class initially
    const wrapperDiv = goToTodayButton?.parentElement?.parentElement;
    expect(wrapperDiv).not.toHaveClass("invisible");

    // Click the go to today button
    await act(async () => {
      await user.click(goToTodayButton);
    });

    // Wait for the navigation to complete and state to update
    await waitFor(() => {
      // The button should now be invisible (has invisible class on wrapper div)
      const updatedWrapperDiv = goToTodayButton?.parentElement?.parentElement;
      expect(updatedWrapperDiv).toHaveClass("invisible");
    });
  });
});

describe("TaskListHeader - Timezone Handling", () => {
  it("should display date in local timezone, not UTC", () => {
    // Simulate 8pm CST on Oct 19 (which is 1am UTC on Oct 20)
    const cstDate = createUtcDate("2025-10-20T01:00:00Z"); // UTC time
    const utcDayjs = dayjs.utc(cstDate);

    renderTaskList({}, cstDate);

    // Should show local date (Oct 19), not UTC date (Oct 20)
    const localDate = utcDayjs.local();
    const expectedHeading = localDate.format(DAY_HEADING_FORMAT);
    const headingButton = screen.getByRole("button", { name: expectedHeading });
    const subheading = screen.getByRole("heading", { level: 3 });

    expect(headingButton).toHaveTextContent(expectedHeading);
    expect(subheading).toHaveTextContent(
      localDate.format(DAY_SUBHEADING_FORMAT),
    );
  });

  it("should correctly identify today in local timezone", () => {
    // Mock current time to be 11pm local (which might be next day in UTC)
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-10-19T23:00:00-05:00"));

    const todayLocal = dayjs();
    const todayUtc = todayLocal.utc();

    renderTaskList({}, todayUtc.toDate());

    // "Go to today" button should be invisible because we're viewing today
    const goToTodayButton = screen.getByLabelText("Go to today");
    const wrapperDiv = goToTodayButton?.parentElement?.parentElement;
    expect(wrapperDiv).toHaveClass("invisible");

    jest.useRealTimers();
  });
});
