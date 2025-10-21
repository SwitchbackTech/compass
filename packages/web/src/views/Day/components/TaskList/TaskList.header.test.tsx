import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "@core/util/date/dayjs";
import { DateNavigationProvider } from "../../context/DateNavigationProvider";
import { TaskProvider } from "../../context/TaskProvider";
import { TaskList } from "./TaskList";
import { DAY_HEADING_FORMAT, DAY_SUBHEADING_FORMAT } from "./TaskListHeader";

const renderTaskList = (props = {}, currentDate?: Date) => {
  const user = userEvent.setup();
  const initialDate = currentDate ? dayjs(currentDate) : dayjs();
  const result = render(
    <MemoryRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <DateNavigationProvider initialDate={initialDate}>
        <TaskProvider>
          <TaskList {...props} />
        </TaskProvider>
      </DateNavigationProvider>
    </MemoryRouter>,
  );
  return { ...result, user };
};

// format dates using the same format as the component
const format = (date: Date) => {
  return dayjs(date).locale("en").format(DAY_HEADING_FORMAT);
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

  it("should hide go to today button after navigating to today from a different day", async () => {
    const testDate = new Date("2025-01-15T12:00:00Z");
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
    const cstDate = new Date("2025-10-20T01:00:00Z"); // UTC time
    const utcDayjs = dayjs.utc(cstDate);

    renderTaskList({}, cstDate);

    const heading = screen.getByRole("heading", { level: 2 });
    const subheading = screen.getByRole("heading", { level: 3 });

    // Should show local date (Oct 19), not UTC date (Oct 20)
    const localDate = utcDayjs.local();
    expect(heading).toHaveTextContent(localDate.format(DAY_HEADING_FORMAT));
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
