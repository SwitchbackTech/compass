import "@testing-library/jest-dom";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";
import { FocusedTask } from "./FocusedTask";

describe("FocusedTask", () => {
  const mockTask = createMockTask({ _id: "task-1", title: "Test Task" });

  const mockCompletedTask = createMockTask({
    _id: "task-2",
    title: "Completed Task",
    status: "completed",
  });

  const mockOnCompleteTask = jest.fn();
  const mockOnPreviousTask = jest.fn();
  const mockOnNextTask = jest.fn();
  const mockOnUpdateTitle = jest.fn();
  const mockOnUpdateDescription = jest.fn();

  const renderFocusedTask = (task = mockTask) =>
    render(
      <FocusedTask
        task={task}
        onCompleteTask={mockOnCompleteTask}
        onPreviousTask={mockOnPreviousTask}
        onNextTask={mockOnNextTask}
        onUpdateTitle={mockOnUpdateTitle}
        onUpdateDescription={mockOnUpdateDescription}
      />,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    compassEventEmitter.removeAllListeners();
  });

  it("renders the task title", () => {
    renderFocusedTask();

    expect(screen.getByText("Test Task")).toBeInTheDocument();
  });

  it("renders the task title in a heading", () => {
    renderFocusedTask();

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Test Task");
  });

  it("renders task with completed status", () => {
    renderFocusedTask(mockCompletedTask);

    expect(screen.getByText("Completed Task")).toBeInTheDocument();
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Completed Task");
  });

  it("renders task with long title", () => {
    const longTitleTask = createMockTask({
      _id: "task-3",
      title: "This is a very long task title that might wrap to multiple lines",
    });

    renderFocusedTask(longTitleTask);

    expect(
      screen.getByText(
        "This is a very long task title that might wrap to multiple lines",
      ),
    ).toBeInTheDocument();
  });

  it("renders task with special characters in title", () => {
    const specialCharTask = createMockTask({
      _id: "task-4",
      title: "Task with @#$%^&*() special chars!",
      status: "todo",
    });

    renderFocusedTask(specialCharTask);

    expect(
      screen.getByText("Task with @#$%^&*() special chars!"),
    ).toBeInTheDocument();
  });

  it("renders task with empty title", () => {
    const emptyTitleTask = createMockTask({
      _id: "task-5",
      title: "",
      status: "todo",
    });

    renderFocusedTask(emptyTitleTask);

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("");
  });

  it("calls onCompleteTask when CheckCircle is clicked", async () => {
    const user = userEvent.setup();
    renderFocusedTask();

    const checkButton = screen.getByRole("button", {
      name: "Mark task as complete",
    });
    await user.click(checkButton);

    expect(mockOnCompleteTask).toHaveBeenCalledTimes(1);
  });

  it("enters title edit mode from the focus-title event", () => {
    renderFocusedTask();

    act(() => {
      compassEventEmitter.emit(CompassDOMEvents.FOCUS_TASK_TITLE);
    });

    const input = screen.getByRole("textbox", { name: "Edit task title" });

    expect(input).toHaveValue("Test Task");
    expect(input).toHaveFocus();
    expect((input as HTMLInputElement).selectionStart).toBe("Test Task".length);
    expect((input as HTMLInputElement).selectionEnd).toBe("Test Task".length);
  });

  it("saves the edited title on blur", async () => {
    const user = userEvent.setup();

    renderFocusedTask();

    act(() => {
      compassEventEmitter.emit(CompassDOMEvents.FOCUS_TASK_TITLE);
    });

    const input = screen.getByRole("textbox", { name: "Edit task title" });

    await user.clear(input);
    await user.type(input, "Updated title");
    await user.tab();

    expect(mockOnUpdateTitle).toHaveBeenCalledWith("Updated title");
    expect(mockOnUpdateTitle).toHaveBeenCalledTimes(1);
  });

  it("saves the edited title on Enter", async () => {
    const user = userEvent.setup();

    renderFocusedTask();

    act(() => {
      compassEventEmitter.emit(CompassDOMEvents.FOCUS_TASK_TITLE);
    });

    const input = screen.getByRole("textbox", { name: "Edit task title" });

    await user.clear(input);
    await user.type(input, "Renamed task");
    await user.keyboard("{Enter}");

    expect(mockOnUpdateTitle).toHaveBeenCalledWith("Renamed task");
    expect(mockOnUpdateTitle).toHaveBeenCalledTimes(1);
  });

  it("cancels title edits on Escape", async () => {
    const user = userEvent.setup();

    renderFocusedTask();

    act(() => {
      compassEventEmitter.emit(CompassDOMEvents.FOCUS_TASK_TITLE);
    });

    const input = screen.getByRole("textbox", { name: "Edit task title" });

    await user.type(input, " updated");
    await user.keyboard("{Escape}");

    expect(mockOnUpdateTitle).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Test Task",
    );
  });

  it("only calls the title update callback when the title changes", async () => {
    const user = userEvent.setup();

    renderFocusedTask();

    act(() => {
      compassEventEmitter.emit(CompassDOMEvents.FOCUS_TASK_TITLE);
    });

    const input = screen.getByRole("textbox", { name: "Edit task title" });

    await user.tab();

    expect(mockOnUpdateTitle).not.toHaveBeenCalled();
  });

  describe("Tooltip Hints", () => {
    it("does not show tooltip initially", () => {
      renderFocusedTask();

      // Tooltips should not be visible initially
      expect(screen.queryByText("Mark Done")).not.toBeInTheDocument();
      expect(screen.queryByText("Previous Task")).not.toBeInTheDocument();
      expect(screen.queryByText("Next Task")).not.toBeInTheDocument();
      expect(screen.queryByText("Enter")).not.toBeInTheDocument();
      expect(screen.queryByText("j")).not.toBeInTheDocument();
      expect(screen.queryByText("k")).not.toBeInTheDocument();
    });

    it("shows tooltip on hover for complete button", async () => {
      const user = userEvent.setup();
      renderFocusedTask();

      const completeButton = screen.getByRole("button", {
        name: "Mark task as complete",
      });

      // Tooltip should not be visible initially
      expect(screen.queryByText("Mark Done")).not.toBeInTheDocument();
      expect(screen.queryByText("Enter")).not.toBeInTheDocument();

      // Hover over button to show tooltip
      await user.hover(completeButton);

      // Wait for tooltip to appear with both description and shortcut
      await waitFor(
        () => {
          expect(screen.getByText("Mark Done")).toBeInTheDocument();
          expect(screen.getByText("Enter")).toBeInTheDocument();
        },
        { timeout: 500 },
      );
    });

    it("shows tooltip on hover for previous button", async () => {
      const user = userEvent.setup();
      renderFocusedTask();

      const previousButton = screen.getByRole("button", {
        name: "Previous task",
      });

      // Tooltip should not be visible initially
      expect(screen.queryByText("Previous Task")).not.toBeInTheDocument();
      expect(screen.queryByText("j")).not.toBeInTheDocument();

      // Hover over button to show tooltip
      await user.hover(previousButton);

      // Wait for tooltip to appear with both description and shortcut
      await waitFor(
        () => {
          expect(screen.getByText("Previous Task")).toBeInTheDocument();
          expect(screen.getByText("j")).toBeInTheDocument();
        },
        { timeout: 500 },
      );
    });

    it("shows tooltip on hover for next button", async () => {
      const user = userEvent.setup();
      renderFocusedTask();

      const nextButton = screen.getByRole("button", {
        name: "Next task",
      });

      // Tooltip should not be visible initially
      expect(screen.queryByText("Next Task")).not.toBeInTheDocument();
      expect(screen.queryByText("k")).not.toBeInTheDocument();

      // Hover over button to show tooltip
      await user.hover(nextButton);

      // Wait for tooltip to appear with both description and shortcut
      await waitFor(
        () => {
          expect(screen.getByText("Next Task")).toBeInTheDocument();
          expect(screen.getByText("k")).toBeInTheDocument();
        },
        { timeout: 500 },
      );
    });

    it("hides tooltip when mouse leaves complete button", async () => {
      const user = userEvent.setup();
      renderFocusedTask();

      const completeButton = screen.getByRole("button", {
        name: "Mark task as complete",
      });

      // Hover to show tooltip
      await user.hover(completeButton);
      await waitFor(
        () => {
          expect(screen.getByText("Mark Done")).toBeInTheDocument();
          expect(screen.getByText("Enter")).toBeInTheDocument();
        },
        { timeout: 500 },
      );

      // Move mouse away to hide tooltip
      await user.unhover(completeButton);
      await waitFor(
        () => {
          expect(screen.queryByText("Mark Done")).not.toBeInTheDocument();
          expect(screen.queryByText("Enter")).not.toBeInTheDocument();
        },
        { timeout: 500 },
      );
    });
  });
});
