import { ID_ADD_TASK_BUTTON } from "@web/common/constants/web.constants";

const findAddTaskButton = () => {
  const labelledButton = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Add task"]',
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
  // Find the first task checkbox button
  const firstTaskButton = document.querySelector<HTMLButtonElement>(
    'button[role="checkbox"][data-task-id]',
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
