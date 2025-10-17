import React from "react";
import { Task as TaskType } from "../../task.types";
import { TaskCircle } from "./TaskCircle";

interface TaskProps {
  task: TaskType;
  index: number;
  title: string;
  isEditing: boolean;
  onCheckboxKeyDown: (
    e: React.KeyboardEvent,
    taskId: string,
    title: string,
  ) => void;
  onInputBlur: (taskId: string) => void;
  onInputClick: (taskId: string, index: number) => void;
  onInputKeyDown: (
    e: React.KeyboardEvent,
    taskId: string,
    index: number,
    value: HTMLInputElement["value"],
  ) => void;
  onStatusToggle: (id: string) => void;
  onTitleChange: (title: string) => void;
  onFocus: (index: number) => void;
}

export const Task = ({
  task,
  index,
  title,
  isEditing,
  onInputKeyDown,
  onInputClick,
  onInputBlur,
  onStatusToggle,
  onFocus,
  onCheckboxKeyDown,
  onTitleChange,
}: TaskProps) => {
  return (
    <div
      key={task.id}
      className={`group flex items-start gap-3 rounded border p-2 transition-colors duration-200 focus-within:border-blue-200/50 focus-within:ring-1 focus-within:ring-blue-200/30 ${task.status === "completed" ? "opacity-50" : ""}`}
    >
      <button
        role="checkbox"
        aria-checked={task.status === "completed"}
        aria-label={`Toggle ${task.title}`}
        tabIndex={0}
        onFocus={() => {
          console.log("focusing on:", index);
          onFocus?.(index);
        }}
        onBlur={() => {}}
        onKeyDown={(e) => onCheckboxKeyDown(e, task.id, task.title)}
        onClick={() => onStatusToggle(task.id)}
        className="mt-1 rounded-full focus:ring-2 focus:ring-blue-200 focus:outline-none"
      >
        <TaskCircle status={task.status} />
      </button>
      <div className="flex-1">
        <input
          tabIndex={-1}
          aria-label={`Edit ${task.title}`}
          className={`text-white-100 w-full bg-transparent text-sm outline-none ${
            isEditing ? "white-100/20 border-b" : "border-b border-transparent"
          }`}
          type="text"
          value={title}
          onClick={() => onInputClick(task.id, index)}
          onBlur={() => onInputBlur(task.id)}
          onKeyDown={(e) =>
            onInputKeyDown(
              e,
              task.id,
              index,
              (e.target as HTMLInputElement).value,
            )
          }
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>
    </div>
  );
};
