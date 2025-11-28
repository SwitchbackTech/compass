import { StringV4Schema } from "@core/types/type.utils";
import { ID_ADD_TASK_BUTTON } from "@web/common/constants/web.constants";

export const isFocusedOnTaskCheckbox = () => {
  // Check if we're focused on a task checkbox
  const activeElement = document.activeElement as HTMLElement | null;
  const isTaskButton =
    activeElement?.getAttribute("role") === "checkbox" &&
    StringV4Schema.safeParse(activeElement?.dataset?.taskId).success;
  return isTaskButton;
};

export const isFocusedWithinTask = () => {
  // Check if we're focused within any task element (checkbox, input, or arrow button)
  const activeElement = document.activeElement as HTMLElement | null;
  if (!activeElement) return false;

  // Check if focused on task checkbox
  if (
    activeElement.getAttribute("role") === "checkbox" &&
    activeElement.dataset?.taskId
  ) {
    return true;
  }

  // Check if focused on task input
  if (
    activeElement.tagName === "INPUT" &&
    activeElement.id?.startsWith("task-input-")
  ) {
    return true;
  }

  // Check if focused on task arrow button
  if (
    activeElement.tagName === "BUTTON" &&
    (activeElement.getAttribute("aria-label") === "Move task to previous day" ||
      activeElement.getAttribute("aria-label") === "Move task to next day")
  ) {
    return true;
  }

  return false;
};

export const getFocusedTaskId = () => {
  // Get the task ID from the currently focused element
  const activeElement = document.activeElement as HTMLElement | null;
  if (!activeElement) return null;

  // Check if focused on task checkbox
  if (
    activeElement.getAttribute("role") === "checkbox" &&
    activeElement.dataset?.taskId
  ) {
    return activeElement.dataset.taskId;
  }

  // Check if focused on task input
  if (
    activeElement.tagName === "INPUT" &&
    activeElement.id?.startsWith("task-input-")
  ) {
    return (
      activeElement.dataset?.taskId ||
      activeElement.id.replace("task-input-", "")
    );
  }

  // Check if focused on task arrow button - need to find the task container
  if (
    activeElement.tagName === "BUTTON" &&
    (activeElement.getAttribute("aria-label") === "Move task to previous day" ||
      activeElement.getAttribute("aria-label") === "Move task to next day")
  ) {
    // Find the task container by looking up the DOM tree
    const taskContainer = activeElement.closest(
      "[data-task-id]",
    ) as HTMLElement;
    return taskContainer?.dataset?.taskId || null;
  }

  return null;
};

export const isEditable = (target: EventTarget | null) => {
  const isEditableTarget =
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.getAttribute("contenteditable") === "true");
  return isEditableTarget;
};

const findAddTaskButton = () => {
  const labelledButton = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Create new task"]',
  );
  if (labelledButton) return labelledButton;

  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("button"),
  );

  return (
    buttons.find((button) => {
      const text = button.textContent?.trim().toLowerCase();
      return text === "create task";
    }) ?? null
  );
};

export const focusOnAddTaskInput = () => {
  const addTaskButton = findAddTaskButton();
  if (!addTaskButton) return;

  addTaskButton.click();
};

export const focusOnFirstTask = () => {
  // Find the first task checkbox button using aria-label pattern
  const firstTaskButton = document.querySelector<HTMLButtonElement>(
    'button[role="checkbox"][aria-label^="Toggle"]',
  );

  if (firstTaskButton) {
    firstTaskButton.focus();
    return;
  }

  // If no tasks exist, focus the "Add task" button
  const addTaskButton = document.getElementById(ID_ADD_TASK_BUTTON);
  if (addTaskButton) {
    addTaskButton.focus();
  }
};
