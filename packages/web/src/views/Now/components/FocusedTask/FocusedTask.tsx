import React from "react";
import {
  ArrowCircleLeftIcon,
  ArrowCircleRightIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
import { Task } from "@web/common/types/task.types";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import {
  TaskDescription,
  TaskDescriptionRef,
} from "../TaskDescription/TaskDescription";

interface FocusedTaskProps {
  task: Task;
  onCompleteTask: () => void;
  onPreviousTask: () => void;
  onNextTask: () => void;
  onUpdateDescription: (description: string) => void;
  descriptionRef?: React.RefObject<TaskDescriptionRef>;
}

export const FocusedTask = ({
  task,
  onCompleteTask,
  onPreviousTask,
  onNextTask,
  onUpdateDescription,
  descriptionRef,
}: FocusedTaskProps) => {
  return (
    <div className="flex flex-1 flex-col items-center gap-10">
      <div className="flex items-center gap-3">
        <h2 className="text-text-lighter text-center text-4xl font-bold drop-shadow-lg">
          {task.title}
        </h2>
      </div>
      <TaskDescription
        ref={descriptionRef}
        description={task.description}
        onSave={onUpdateDescription}
      />
      <div className="flex items-center justify-center gap-3">
        <TooltipWrapper
          description="Mark Done"
          shortcut="Enter"
          onClick={onCompleteTask}
        >
          <button
            aria-label="Mark task as complete"
            className="cursor-pointer rounded-full p-1 transition-all duration-200 hover:brightness-125 focus:brightness-125"
          >
            <CheckCircleIcon size={40} className="text-text-light" />
          </button>
        </TooltipWrapper>
        <TooltipWrapper
          description="Previous Task"
          shortcut="j"
          onClick={onPreviousTask}
        >
          <button
            aria-label="Previous task"
            className="cursor-pointer rounded-full p-1 transition-all duration-200 hover:brightness-125 focus:brightness-125"
          >
            <ArrowCircleLeftIcon size={40} className="text-text-light" />
          </button>
        </TooltipWrapper>
        <TooltipWrapper
          description="Next Task"
          shortcut="k"
          onClick={onNextTask}
        >
          <button
            aria-label="Next task"
            className="cursor-pointer rounded-full p-1 transition-all duration-200 hover:brightness-125 focus:brightness-125"
          >
            <ArrowCircleRightIcon size={40} className="text-text-light" />
          </button>
        </TooltipWrapper>
      </div>
    </div>
  );
};
