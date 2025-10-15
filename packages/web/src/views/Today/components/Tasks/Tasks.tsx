import React from "react";
import { useTasks } from "../../context/TaskProvider";

export const Tasks = () => {
  const {
    tasks,
    toggleTaskStatus,
    editInputRef,
    editingTaskId,
    editingTitle,
    setFocusedTaskId,
    setEditingTaskId,
    setEditingTitle,
    setSelectedTaskIndex,
    updateTaskTitle,
  } = useTasks();
  return (
    <div className="space-y-3">
      {tasks.map((task, index) => (
        <div
          key={task.id}
          data-task-id={task.id}
          className={`group flex items-start gap-3 rounded border p-2 ${task.status === "completed" ? "opacity-50" : ""}`}
        >
          <button
            data-task-id={task.id}
            role="checkbox"
            aria-checked={task.status === "completed"}
            aria-label={`Toggle ${task.title}`}
            tabIndex={0}
            onFocus={() => {
              setSelectedTaskIndex?.(index);
              setFocusedTaskId?.(task.id);
            }}
            onBlur={(e) => {
              const next = e.relatedTarget as HTMLElement | null;
              if (!next?.dataset?.taskId) {
                setFocusedTaskId?.(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                toggleTaskStatus(task.id);
              }
            }}
            onClick={() => toggleTaskStatus(task.id)}
            className="mt-1 rounded-full focus:ring-2 focus:ring-blue-200 focus:outline-none"
          >
            {task.status === "completed" ? (
              <svg
                className="text-green h-4 w-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4 text-gray-200 opacity-0 transition-opacity group-hover:opacity-100"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
              </svg>
            )}
          </button>
          <div className="flex-1">
            {editingTaskId === task.id ? (
              <input
                ref={editInputRef}
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateTaskTitle(task.id, editingTitle.trim() || task.title);
                    setEditingTaskId(null);
                    setEditingTitle("");
                  } else if (e.key === "Escape") {
                    setEditingTaskId(null);
                    setEditingTitle("");
                  }
                }}
                onBlur={() => {
                  if (editingTitle.trim()) {
                    updateTaskTitle(task.id, editingTitle.trim());
                  }
                  setEditingTaskId(null);
                  setEditingTitle("");
                }}
                className="text-white-100 border-white-100/20 w-full border-b bg-transparent text-sm placeholder-gray-200 outline-none"
                aria-label={`Edit ${task.title}`}
              />
            ) : (
              <p
                className="text-white-100 cursor-text text-sm leading-relaxed"
                onClick={() => {
                  setEditingTaskId(task.id);
                  setEditingTitle(task.title);
                }}
              >
                {task.title}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
