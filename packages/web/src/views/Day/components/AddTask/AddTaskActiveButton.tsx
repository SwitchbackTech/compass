import type React from "react";
import { type RefObject } from "react";
import { PlusIcon } from "../Icons/PlusIcon";

interface AddTaskActiveButtonProps {
  newTaskTitle: string;
  setNewTaskTitle: (title: string) => void;
  addTaskInputRef: RefObject<HTMLInputElement>;
  onAddTask: () => void;
  onAddTaskKeyDown: (e: React.KeyboardEvent) => void;
  onBlur: () => void;
}

export function AddTaskActiveButton({
  newTaskTitle,
  setNewTaskTitle,
  addTaskInputRef,
  onAddTask,
  onAddTaskKeyDown,
  onBlur,
}: AddTaskActiveButtonProps) {
  return (
    <div className="flex items-start gap-3 rounded border border-accent-secondary/30 bg-accent-secondary/5 p-2">
      <button
        type="button"
        onClick={onAddTask}
        aria-label="Create task"
        className="mt-1"
      >
        <PlusIcon className="h-4 w-4 text-accent-secondary" />
      </button>
      <div className="flex-1">
        <input
          ref={addTaskInputRef}
          id="add-task-input"
          name="new-task-title"
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={onAddTaskKeyDown}
          onBlur={onBlur}
          placeholder="Enter task title..."
          aria-label="Task title"
          className="w-full bg-transparent text-sm text-text-lighter placeholder-text-light-inactive outline-none"
        />
      </div>
    </div>
  );
}
