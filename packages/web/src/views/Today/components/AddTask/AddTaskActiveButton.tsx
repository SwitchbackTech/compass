import React, { RefObject } from "react";
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
    <div className="flex items-start gap-3 rounded border border-blue-200/30 bg-blue-200/5 p-2">
      <button
        type="button"
        onClick={onAddTask}
        aria-label="Add task"
        className="mt-1"
      >
        <PlusIcon className="h-4 w-4 text-blue-200" />
      </button>
      <div className="flex-1">
        <input
          ref={addTaskInputRef}
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={onAddTaskKeyDown}
          onBlur={onBlur}
          placeholder="Enter task title..."
          aria-label="Task title"
          className="text-white-100 w-full bg-transparent text-sm placeholder-gray-200 outline-none"
        />
      </div>
    </div>
  );
}
