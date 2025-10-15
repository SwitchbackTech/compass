import React, { useRef, useState } from "react";
import { CalendarAgenda } from "./components/CalendarAgenda";
import { TaskList } from "./components/TaskList";
import { useTasks } from "./context/TaskProvider";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

export const TodayViewContent = () => {
  const { tasks } = useTasks();
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const tasksScrollRef = useRef<HTMLDivElement>(null);

  const activeElement =
    typeof document !== "undefined"
      ? (document.activeElement as HTMLElement | null)
      : null;
  const isEditableElement =
    (typeof HTMLInputElement !== "undefined" &&
      activeElement instanceof HTMLInputElement) ||
    (typeof HTMLTextAreaElement !== "undefined" &&
      activeElement instanceof HTMLTextAreaElement) ||
    activeElement?.getAttribute("contenteditable") === "true";

  const focusTaskAtIndex = (index: number) => {
    if (index < 0 || index >= tasks.length) return;
    const task = tasks[index];
    if (!task) return;

    setSelectedTaskIndex(index);
    setFocusedTaskId(task.id);

    const button = tasksScrollRef.current?.querySelector<HTMLButtonElement>(
      `[data-task-id="${task.id}"]`,
    );
    if (button) {
      try {
        button.focus({ preventScroll: true });
      } catch {
        try {
          button.focus();
        } catch {
          // Ignore if focus fails
        }
      }
      try {
        button.scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: "smooth",
        });
      } catch {
        // Ignore if scrollIntoView fails
      }
    }
  };

  const focusFirstTask = () => {
    if (!tasks.length) return;
    focusTaskAtIndex(0);
  };

  const handleNextTask = () => {
    if (!tasks.length) return;
    const currentIndex = tasks.findIndex((task) => task.id === focusedTaskId);
    if (currentIndex === -1) {
      focusTaskAtIndex(0);
      return;
    }
    const nextIndex = (currentIndex + 1) % tasks.length;
    focusTaskAtIndex(nextIndex);
  };

  const handlePrevTask = () => {
    if (!tasks.length) return;
    const currentIndex = tasks.findIndex((task) => task.id === focusedTaskId);
    if (currentIndex === -1) {
      focusTaskAtIndex(tasks.length - 1);
      return;
    }
    const prevIndex = (currentIndex - 1 + tasks.length) % tasks.length;
    focusTaskAtIndex(prevIndex);
  };

  useKeyboardShortcuts({
    onFocusTasks: focusFirstTask,
    onNextTask: handleNextTask,
    onPrevTask: handlePrevTask,
    hasFocusedTask: !!focusedTaskId,
    isInInput: isEditableElement,
  });

  return (
    <div className="flex h-screen w-full items-center justify-center gap-8 overflow-hidden px-6 py-8">
      <TaskList
        onTaskFocus={setFocusedTaskId}
        focusedTaskId={focusedTaskId}
        onSelectTask={setSelectedTaskIndex}
        selectedTaskIndex={selectedTaskIndex}
      />

      <CalendarAgenda />
    </div>
  );
};
