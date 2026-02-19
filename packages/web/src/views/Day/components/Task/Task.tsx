import classNames from "classnames";
import React, { useRef } from "react";
import { DATA_TASK_ELEMENT_ID } from "@web/common/constants/web.constants";
import { Task as TaskType } from "@web/common/types/task.types";
import { ArrowButton } from "@web/components/Button/ArrowButton";
import { TaskCircleIcon } from "@web/views/Day/components/Icons/TaskCircleIcon";

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
  const checkboxRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      key={task._id}
      {...{ [DATA_TASK_ELEMENT_ID]: task._id }}
      data-testid={task._id}
      className={`group flex items-start gap-3 rounded border p-2 transition-colors duration-200 focus-within:border-blue-200/50 focus-within:ring-1 focus-within:ring-blue-200/30 ${task.status === "completed" ? "opacity-50" : ""}`}
    >
      <button
        role="checkbox"
        ref={checkboxRef}
        aria-checked={task.status === "completed"}
        aria-label={`Toggle ${task.title}`}
        tabIndex={0}
        data-task-id={task._id}
        onFocus={() => {
          onFocus?.(index);
        }}
        onKeyDown={(e) => onCheckboxKeyDown(e, task._id, task.title)}
        onClick={() => onStatusToggle(task._id)}
        className="mt-1 rounded-full focus:ring-2 focus:ring-blue-200 focus:outline-none"
      >
        <TaskCircleIcon status={task.status} />
      </button>
      <div className="flex-1">
        <input
          tabIndex={-1}
          aria-label={`Edit ${task.title}`}
          data-task-id={task._id}
          id={`task-input-${task._id}`}
          name={`task-title-${task._id}`}
          className={classNames(
            "text-white-100 w-full text-sm outline-none",
            "border-b border-transparent bg-transparent",
            { "border-white/20": isEditing },
          )}
          type="text"
          value={title}
          onClick={() => onInputClick(task._id)}
          onBlur={() => onInputBlur(task._id)}
          onKeyDownCapture={(e) => {
            if (e.key !== "Tab") return;
            // this will focus the checkbox
            // then immediately focus the move to previous btn
            // the - default browser tab order
            // this accommodates the hidden migration buttons during editing
            checkboxRef.current?.focus();
          }}
          onKeyDown={(e) =>
            onInputKeyDown(e, task._id, index, e.currentTarget.value)
          }
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>

      <div
        className={classNames("ml-auto hidden gap-1", {
          "group-focus-within:flex group-hover:flex": !isEditing,
        })}
      >
        <ArrowButton
          direction="left"
          label="Move task to previous day"
          onClick={() => onMigrate(task._id, "backward")}
        />
        <ArrowButton
          direction="right"
          label="Move task to next day"
          onClick={() => onMigrate(task._id, "forward")}
        />
      </div>
    </div>
  );
};
