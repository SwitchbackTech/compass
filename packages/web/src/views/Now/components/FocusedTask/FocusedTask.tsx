import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StringV4Schema } from "@core/types/type.utils";
import { useTasks } from "@web/views/Day/hooks/tasks/useTasks";
import { CelebrateTaskComplete } from "./CelebrateTaskComplete";

export function FocusedTask() {
  const router = useNavigate();
  const data = useTasks();
  const { tasks, selectedTask, editingTaskId, editingTitle } = data;
  const { selectTask, onInputBlur } = data;
  const { onInputClick, onInputKeyDown } = data;
  const { setEditingTitle, toggleTaskStatus } = data;
  const [showCelebration, setShowCelebration] = useState(false);
  const focusedEditInputRef = useRef<HTMLInputElement>(null);

  const focusedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTask),
    [tasks, selectedTask],
  );

  const isEditingFocusedTask = useMemo(
    () =>
      StringV4Schema.safeParse(selectedTask).success &&
      selectedTask === editingTaskId,
    [selectedTask, editingTaskId],
  );

  const handleFocusedTaskComplete = useCallback(() => {
    if (!focusedTask) return;

    setShowCelebration(true);
    toggleTaskStatus(focusedTask.id);

    setTimeout(() => {
      setShowCelebration(false);

      const nextTask = tasks.find(
        (task) => task.id !== focusedTask.id && task.status !== "completed",
      );

      if (nextTask) {
        selectTask(nextTask.id);
      } else {
        router("/today");
      }
    }, 800);
  }, [focusedTask, router, selectTask, tasks, toggleTaskStatus]);

  const startEditingFocusedTask = useCallback(() => {
    if (!focusedTask) return;
    // onInputClick(focusedTask.id);
    // setTimeout(() => focusedEditInputRef.current?.focus(), 0);
  }, [focusedTask, onInputClick]);

  if (!focusedTask) return null;

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-4xl px-8 text-center">
        <div className="mb-8">
          {isEditingFocusedTask ? (
            <input
              ref={focusedEditInputRef}
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onBlur={() => onInputBlur(focusedTask.id)}
              onKeyDown={(e) => onInputKeyDown(e, focusedTask.id)}
              className="font-caveat w-full border-none bg-transparent text-center text-4xl text-white outline-none"
              placeholder="Enter task title..."
            />
          ) : (
            <h1
              className="font-caveat cursor-pointer text-center text-4xl transition-opacity text-shadow-white hover:opacity-80"
              onClick={startEditingFocusedTask}
            >
              {focusedTask.title}
            </h1>
          )}
        </div>

        <div className="flex items-center justify-center gap-4">
          <div className="relative">
            <button
              onClick={handleFocusedTaskComplete}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFocusedTaskComplete();
              }}
              className="group relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-white transition-all duration-200 hover:scale-110 hover:border-green-400"
              title="Mark Done (Enter)"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white transition-colors group-hover:text-green-400"
              >
                <path d="M5 12l5 5L20 7" />
              </svg>

              <div className="absolute -top-12 left-1/2 -translate-x-1/2 transform rounded-md bg-gray-800 px-3 py-1 text-sm whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                Mark Done (Enter)
              </div>
            </button>

            <CelebrateTaskComplete celebrate={showCelebration} />
          </div>
        </div>
      </div>
    </div>
  );
}
