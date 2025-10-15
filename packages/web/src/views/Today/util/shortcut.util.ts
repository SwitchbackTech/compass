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
