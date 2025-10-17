import { ID_ADD_TASK_BUTTON } from "@web/common/constants/web.constants";

export const isFocusedOnTaskCheckbox = () => {
  // Check if we're focused on a task checkbox
  const activeElement = document.activeElement as HTMLElement | null;
  const isTaskButton =
    activeElement?.getAttribute("role") === "checkbox" &&
    activeElement?.dataset?.taskId;
  return isTaskButton;
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
    'button[aria-label="Add new task"]',
  );
  if (labelledButton) return labelledButton;

  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("button"),
  );

  return (
    buttons.find((button) => {
      const text = button.textContent?.trim().toLowerCase();
      return text === "add task";
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
