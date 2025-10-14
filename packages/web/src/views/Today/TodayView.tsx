import { useFeatureFlagEnabled } from "posthog-js/react";
import React, { useRef, useState } from "react";
import { CalendarAgenda } from "./components/CalendarAgenda";
import { TaskList } from "./components/TaskList";
import { TaskProvider, useTasks } from "./context/TaskProvider";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

function TodayViewContent() {
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
    <div className="flex h-screen bg-darkBlue-400">
      {/* Tasks Panel */}
      <div className="w-96 flex-shrink-0">
        <TaskList
          onTaskFocus={setFocusedTaskId}
          focusedTaskId={focusedTaskId}
          onSelectTask={setSelectedTaskIndex}
          selectedTaskIndex={selectedTaskIndex}
        />
      </div>

      {/* Calendar Panel */}
      <div className="flex-1">
        <CalendarAgenda />
      </div>
    </div>
  );
}

export function TodayView() {
  const isPlannerEnabled = useFeatureFlagEnabled("experiment_planner");

  return (
    <TaskProvider>
      {!isPlannerEnabled && (
        <div className="bg-orange/20 border-b border-orange/30 px-4 py-2 text-white-100 text-sm">
          <strong>Experimental Feature:</strong> This feature is currently in
          beta. Enable the "experiment_planner" feature flag in PostHog to
          dismiss this warning.
        </div>
      )}
      <div
        className="flex-1"
        style={{
          height: isPlannerEnabled ? "100vh" : "calc(100vh - 40px)",
        }}
      >
        <TodayViewContent />
      </div>
    </TaskProvider>
  );
}
