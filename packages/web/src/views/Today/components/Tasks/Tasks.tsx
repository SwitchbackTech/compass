import React, { useRef, useState } from "react";
import { useTasks } from "../../context/TaskProvider";
import { TaskCircle } from "./TaskCircle";

export const Tasks = () => {
  const {
    tasks,
    toggleTaskStatus,
    editInputRef,
    editingTaskId,
    editingTitle,
    setEditingTaskId,
    setEditingTitle,
    setSelectedTaskIndex,
    updateTaskTitle,
  } = useTasks();

  const taskButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const taskInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const escPressedRef = useRef(false);
  const [focusedInputIndex, setFocusedInputIndex] = useState<number | null>(
    null,
  );
  return (
    <div className="space-y-3">
      {tasks.map((task, index) => (
        <div
          key={task.id}
          className={`group flex items-start gap-3 rounded border p-2 transition-colors duration-200 focus-within:border-blue-200/50 focus-within:ring-1 focus-within:ring-blue-200/30 ${task.status === "completed" ? "opacity-50" : ""}`}
        >
          <button
            ref={(el) => {
              taskButtonRefs.current[index] = el;
            }}
            role="checkbox"
            aria-checked={task.status === "completed"}
            aria-label={`Toggle ${task.title}`}
            tabIndex={0}
            onFocus={() => {
              setSelectedTaskIndex?.(index);
            }}
            onBlur={() => {}}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                toggleTaskStatus(task.id);
              } else if (e.key === "e" || e.key === "E") {
                e.preventDefault();
                setEditingTaskId(task.id);
                setEditingTitle(task.title);
                // Focus the input after entering edit mode
                setTimeout(() => {
                  taskInputRefs.current[index]?.focus();
                }, 0);
              }
            }}
            onClick={() => toggleTaskStatus(task.id)}
            className="mt-1 rounded-full focus:ring-2 focus:ring-blue-200 focus:outline-none"
          >
            <TaskCircle status={task.status} />
          </button>
          <div className="flex-1">
            <input
              ref={(el) => {
                taskInputRefs.current[index] = el;
                if (editingTaskId === task.id && editInputRef) {
                  (
                    editInputRef as React.MutableRefObject<HTMLInputElement | null>
                  ).current = el;
                }
              }}
              type="text"
              value={editingTaskId === task.id ? editingTitle : task.title}
              onChange={(e) => {
                if (editingTaskId === task.id) {
                  setEditingTitle(e.target.value);
                } else {
                  // Direct editing when not in explicit edit mode
                  updateTaskTitle(task.id, e.target.value);
                }
              }}
              onFocus={() => {
                setFocusedInputIndex(index);
                setEditingTaskId(task.id);
                setEditingTitle(task.title);
                setSelectedTaskIndex?.(index);
                // Select all text when focused
                setTimeout(() => {
                  if (taskInputRefs.current[index]) {
                    taskInputRefs.current[index]?.select();
                  }
                }, 0);
              }}
              onBlur={() => {
                setFocusedInputIndex(null);
                if (editingTitle.trim() && !escPressedRef.current) {
                  updateTaskTitle(task.id, editingTitle.trim());
                }
                setEditingTaskId(null);
                setEditingTitle("");
                // Reset the ESC flag
                escPressedRef.current = false;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  updateTaskTitle(task.id, editingTitle.trim() || task.title);
                  setEditingTaskId(null);
                  setEditingTitle("");
                  // Move to next task input or circle
                  if (index < tasks.length - 1) {
                    taskInputRefs.current[index + 1]?.focus();
                  } else {
                    // If last task, focus the next circle
                    taskButtonRefs.current[index + 1]?.focus();
                  }
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  escPressedRef.current = true;
                  setEditingTaskId(null);
                  setEditingTitle("");
                  // Refocus the button
                  taskButtonRefs.current[index]?.focus();
                }
              }}
              className={`text-white-100 w-full bg-transparent text-sm outline-none ${
                focusedInputIndex === index || editingTaskId === task.id
                  ? "white-100/20 border-b"
                  : "border-b border-transparent"
              }`}
              aria-label={`Edit ${task.title}`}
              tabIndex={0}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
