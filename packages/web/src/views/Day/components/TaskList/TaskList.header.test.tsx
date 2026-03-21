import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { renderWithDayProvidersAsync } from "../../util/day.test-util";
import { TaskList } from "./TaskList";
import { DAY_HEADING_FORMAT, DAY_SUBHEADING_FORMAT } from "./TaskListHeader";

const renderTaskList = async (props = {}, currentDate?: Date) => {
  const initialDate = currentDate ? dayjs(currentDate) : dayjs();
  return renderWithDayProvidersAsync(<TaskList {...props} />, {
    initialDate,
  });
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

  it("should render the today heading with current date", async () => {
    await renderTaskList();

    const headingButton = await screen.findByRole("button", {
      name: /select view/i,
    });
    const subheading = await screen.findByRole("heading", { level: 3 });
    expect(headingButton).toBeInTheDocument();
    expect(subheading).toBeInTheDocument();
    expect(headingButton.textContent).toMatch(/\w+/); // Matches format like "Wednesday"
    expect(subheading.textContent).toMatch(/\w+ \d+/); // Matches format like "January 15"
  });

  it("should navigate to next day when clicking next day button", async () => {
    const testDate = createUtcDate("2025-01-15T12:00:00Z");
    const { user } = await renderTaskList({}, testDate);

    // Verify initial heading shows correct date
    const expectedInitialDate = format(testDate);
    const headingButton = await screen.findByRole("button", {
      name: /select view/i,
    });
    expect(headingButton).toHaveTextContent(expectedInitialDate);

    const nextButton = await screen.findByRole("button", { name: "Next day" });
    const expectedNextDate = format(createUtcDate(testDate, 1));
    await user.click(nextButton);
    await waitFor(() => {
      expect(headingButton).toHaveTextContent(expectedNextDate);
    });
  });

  it("should navigate to previous day when clicking previous day button", async () => {
    const testDate = createUtcDate("2025-01-15T12:00:00Z");
    const { user } = await renderTaskList({}, testDate);

    // Verify initial heading shows correct date
    const expectedInitialDate = format(testDate);
    const headingButton = await screen.findByRole("button", {
      name: /select view/i,
    });
    expect(headingButton).toHaveTextContent(expectedInitialDate);

    const prevButton = await screen.findByRole("button", {
      name: "Previous day",
    });
    const expectedPrevDate = format(createUtcDate(testDate, -1));
    await user.click(prevButton);
    await waitFor(() => {
      expect(headingButton).toHaveTextContent(expectedPrevDate);
    });
  });

  it("should handle multiple navigation clicks correctly", async () => {
    const testDate = createUtcDate("2025-01-15T12:00:00Z");
    const { user } = await renderTaskList({}, testDate);

    const headingButton = await screen.findByRole("button", {
      name: /select view/i,
    });
    const nextButton = await screen.findByRole("button", { name: "Next day" });
    const prevButton = await screen.findByRole("button", {
      name: "Previous day",
    });

    const expectedAfterFirstNext = format(createUtcDate(testDate, 1));
    await user.click(nextButton);
    await waitFor(() => {
      expect(headingButton).toHaveTextContent(expectedAfterFirstNext);
    });

    const expectedAfterSecondNext = format(createUtcDate(testDate, 2));
    await user.click(nextButton);
    await waitFor(() => {
      expect(headingButton).toHaveTextContent(expectedAfterSecondNext);
    });

    const expectedAfterPrev = format(createUtcDate(testDate, 1));
    await user.click(prevButton);
    await waitFor(() => {
      expect(headingButton).toHaveTextContent(expectedAfterPrev);
    });
  });

  it("should navigate across month boundary correctly", async () => {
    const testDate = createUtcDate("2025-01-31T12:00:00Z");
    const { user } = await renderTaskList({}, testDate);

    const initialDate = format(testDate);
    const headingButton = await screen.findByRole("button", {
      name: /select view/i,
    });
    const nextButton = await screen.findByRole("button", { name: "Next day" });

    // Verify initial date is end of January
    expect(headingButton).toHaveTextContent(initialDate);

    const nextDate = format(createUtcDate(testDate, 1));
    await user.click(nextButton);
    await waitFor(() => {
      expect(headingButton).toHaveTextContent(nextDate);
    });
  });

  it("should show go to today button when viewing a different day", async () => {
    const testDate = createUtcDate("2025-01-15T12:00:00Z");
    await renderTaskList({}, testDate);

    const goToTodayButton = await screen.findByRole("button", {
      name: "Go to today",
    });
    expect(goToTodayButton).toBeInTheDocument();
  });

  it("should not show go to today button when viewing today", async () => {
    await renderTaskList();

    const goToTodayButton = screen.queryByRole("button", {
      name: "Go to today",
    });

    expect(goToTodayButton).not.toBeInTheDocument();
  });

  it("should navigate to today when clicking go to today button", async () => {
    const testDate = createUtcDate("2025-01-15T12:00:00Z");
    const { user } = await renderTaskList({}, testDate);

    const expectedInitialDate = format(testDate);
    const headingButton = await screen.findByRole("button", {
      name: /select view/i,
    });
    const goToTodayButton = await screen.findByRole("button", {
      name: "Go to today",
    });

    // Verify initial heading shows the test date
    expect(headingButton).toHaveTextContent(expectedInitialDate);

    const expectedTodayDate = format(createUtcDate(new Date()));
    await user.click(goToTodayButton);
    await waitFor(() => {
      expect(headingButton).toHaveTextContent(expectedTodayDate);
    });
  });

  it("should remove the go to today button after navigating to today from a different day", async () => {
    const testDate = createUtcDate("2025-01-15T12:00:00Z");
    const { user } = await renderTaskList({}, testDate);

    // Verify the go to today button is initially visible
    const goToTodayButton = await screen.findByRole("button", {
      name: "Go to today",
    });

    expect(goToTodayButton).toBeInTheDocument();

    await user.click(goToTodayButton);
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Go to today" }),
      ).not.toBeInTheDocument();
    });
  });
});

describe("TaskListHeader - Timezone Handling", () => {
  it("should display date in local timezone, not UTC", async () => {
    // Simulate 8pm CST on Oct 19 (which is 1am UTC on Oct 20)
    const cstDate = createUtcDate("2025-10-20T01:00:00Z"); // UTC time
    const utcDayjs = dayjs.utc(cstDate);

    await renderTaskList({}, cstDate);

    // Should show local date (Oct 19), not UTC date (Oct 20)
    const localDate = utcDayjs.local();
    const expectedHeading = localDate.format(DAY_HEADING_FORMAT);
    const headingButton = await screen.findByRole("button", {
      name: /select view/i,
    });
    const subheading = await screen.findByRole("heading", { level: 3 });

    expect(headingButton).toHaveTextContent(expectedHeading);
    expect(subheading).toHaveTextContent(
      localDate.format(DAY_SUBHEADING_FORMAT),
    );
  });

  it("should correctly identify today in local timezone", async () => {
    // Mock current time to be 11pm local (which might be next day in UTC)
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-10-19T23:00:00-05:00"));

    const todayLocal = dayjs();
    const todayUtc = todayLocal.utc();

    await renderTaskList({}, todayUtc.toDate());

    // "Go to today" button should not be present because we're viewing today
    const goToTodayButton = screen.queryByLabelText("Go to today");

    expect(goToTodayButton).not.toBeInTheDocument();

    jest.useRealTimers();
  });
});
