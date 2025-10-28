import React from "react";
import { DATA_TASK_ELEMENT_ID } from "@web/common/constants/web.constants";
import { ArrowButton } from "@web/components/Button/ArrowButton";
import { Task as TaskType } from "../../task.types";
import { TaskCircleIcon } from "../Icons/TaskCircleIcon";

export interface TaskProps {
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
  onInputClick: (taskId: string) => void;
  onInputKeyDown: (
    e: React.KeyboardEvent,
    taskId: string,
    index: number,
    value: string,
  ) => void;
  onStatusToggle: (id: string) => void;
  onTitleChange: (title: string) => void;
  onFocus: (index: number) => void;
  onMigrate: (id: string, direction: "forward" | "backward") => void;
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
  onMigrate,
}: TaskProps) => {
  return (
    <div
      key={task.id}
      {...{ [DATA_TASK_ELEMENT_ID]: task.id }}
      className={`group flex items-start gap-3 rounded border p-2 transition-colors duration-200 focus-within:border-blue-200/50 focus-within:ring-1 focus-within:ring-blue-200/30 ${task.status === "completed" ? "opacity-50" : ""}`}
    >
      <button
        role="checkbox"
        aria-checked={task.status === "completed"}
        aria-label={`Toggle ${task.title}`}
        tabIndex={0}
        data-task-id={task.id}
        onFocus={() => {
          onFocus?.(index);
        }}
        onKeyDown={(e) => onCheckboxKeyDown(e, task.id, task.title)}
        onClick={() => onStatusToggle(task.id)}
        className="mt-1 rounded-full focus:ring-2 focus:ring-blue-200 focus:outline-none"
      >
        <TaskCircleIcon status={task.status} />
      </button>
      <div className="flex-1">
        <input
          tabIndex={-1}
          aria-label={`Edit ${task.title}`}
          data-task-id={task.id}
          id={`task-input-${task.id}`}
          name={`task-title-${task.id}`}
          className={`text-white-100 w-full bg-transparent text-sm outline-none ${
            isEditing
              ? "border-b border-white/20"
              : "border-b border-transparent"
          }`}
          type="text"
          value={title}
          onClick={() => onInputClick(task.id)}
          onBlur={() => onInputBlur(task.id)}
          onKeyDown={(e) =>
            onInputKeyDown(e, task.id, index, e.currentTarget.value)
          }
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>
      <div className="ml-auto flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <ArrowButton
          direction="left"
          label="Move task to previous day"
          onClick={() => onMigrate(task.id, "backward")}
        />
        <ArrowButton
          direction="right"
          label="Move task to next day"
          onClick={() => onMigrate(task.id, "forward")}
        />
      </div>
    </div>
  );
};
