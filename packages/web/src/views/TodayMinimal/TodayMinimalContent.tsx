import React, { useRef, useState } from "react";
import { CalendarAgenda } from "./components/CalendarAgenda";
import { TaskList } from "./components/TaskList";
import { useTodayMinimal } from "./context/TodayMinimalProvider";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

export const TodayMinimalContent = () => {
  const { tasks } = useTodayMinimal();
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);
  const [focusedEventPart, setFocusedEventPart] = useState<
    "start" | "block" | "end" | null
  >(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);

  const tasksScrollRef = useRef<HTMLDivElement>(null);
  const calendarScrollRef = useRef<HTMLDivElement>(null);

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
    setFocusedEventId(null);
    setFocusedEventPart(null);

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

  const handleAddTask = () => {
    setIsAddingTask(true);
    setFocusedTaskId(null);
    setFocusedEventId(null);
    setFocusedEventPart(null);
  };

  const handleEditTask = () => {
    if (focusedTaskId) {
      setIsEditingTask(true);
      // The TaskList component will handle the actual editing
    }
  };

  const handleCompleteTask = () => {
    if (focusedTaskId) {
      // The TaskList component will handle the actual completion
    }
  };

  const focusCalendar = () => {
    setFocusedTaskId(null);
    setFocusedEventId(null);
    setFocusedEventPart(null);

    // Focus the first event or calendar surface
    const firstEvent = calendarScrollRef.current?.querySelector<HTMLElement>(
      '[data-calendar-event="true"]',
    );
    if (firstEvent) {
      try {
        firstEvent.focus();
      } catch {
        // Ignore if focus fails
      }
    }
  };

  const handleEscape = () => {
    setFocusedTaskId(null);
    setFocusedEventId(null);
    setFocusedEventPart(null);
    setIsAddingTask(false);
    setIsEditingTask(false);
  };

  useKeyboardShortcuts({
    onAddTask: handleAddTask,
    onEditTask: handleEditTask,
    onCompleteTask: handleCompleteTask,
    onFocusTasks: focusFirstTask,
    onFocusCalendar: focusCalendar,
    onNextTask: handleNextTask,
    onPrevTask: handlePrevTask,
    onEscape: handleEscape,
    isAddingTask,
    isEditingTask,
    hasTasks: tasks.length > 0,
    hasFocusedTask: !!focusedTaskId,
    hasFocusedEvent: !!focusedEventId,
    isInInput: isEditableElement,
  });

  return (
    <div className="flex min-h-screen justify-center bg-darkBlue-400 px-6 py-8">
      <div className="flex w-full max-w-7xl items-stretch gap-8">
        {/* Tasks Panel */}
        <div className="flex w-96 text-white flex-shrink-0">
          <TaskList
            onTaskFocus={setFocusedTaskId}
            focusedTaskId={focusedTaskId}
            onSelectTask={setSelectedTaskIndex}
            selectedTaskIndex={selectedTaskIndex}
          />
        </div>

        {/* Calendar Panel */}
        <div className="flex flex-1 min-w-0">
          <CalendarAgenda />
        </div>
      </div>
    </div>
  );
};
