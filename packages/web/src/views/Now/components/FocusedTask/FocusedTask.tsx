import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowCircleLeftIcon,
  ArrowCircleRightIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
import { type Task } from "@web/common/types/task.types";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { TaskDescription } from "../TaskDescription/TaskDescription";

interface FocusedTaskProps {
  task: Task;
  onCompleteTask: () => void;
  onPreviousTask: () => void;
  onNextTask: () => void;
  titleEditRequestKey?: number;
  descriptionEditRequestKey?: number;
  descriptionSaveRequestKey?: number;
  onUpdateTitle: (title: string) => void;
  onUpdateDescription: (description: string) => void;
}

export const FocusedTask = ({
  task,
  onCompleteTask,
  onPreviousTask,
  onNextTask,
  titleEditRequestKey = 0,
  descriptionEditRequestKey = 0,
  descriptionSaveRequestKey = 0,
  onUpdateTitle,
  onUpdateDescription,
}: FocusedTaskProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const originalTitleRef = useRef(task.title);
  const previousTitleEditRequestKeyRef = useRef(titleEditRequestKey);

  useEffect(() => {
    setIsEditingTitle(false);
    setTitleValue(task.title);
    originalTitleRef.current = task.title;
  }, [task._id, task.title]);

  useEffect(() => {
    if (!isEditingTitle || !titleInputRef.current) return;

    const input = titleInputRef.current;
    const caretPosition = input.value.length;

    input.focus();
    input.setSelectionRange(caretPosition, caretPosition);
  }, [isEditingTitle]);

  useEffect(() => {
    if (titleEditRequestKey === previousTitleEditRequestKeyRef.current) return;

    previousTitleEditRequestKeyRef.current = titleEditRequestKey;

    setIsEditingTitle(true);
  }, [titleEditRequestKey]);

  const saveTitle = () => {
    const trimmedTitle = titleValue.trim();

    setIsEditingTitle(false);

    if (!trimmedTitle) {
      setTitleValue(originalTitleRef.current);
      return;
    }

    if (trimmedTitle !== originalTitleRef.current) {
      onUpdateTitle(trimmedTitle);
      originalTitleRef.current = trimmedTitle;
    }

    setTitleValue(trimmedTitle);
  };

  const handleTitleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setTitleValue(originalTitleRef.current);
      setIsEditingTitle(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-10">
      <div className="flex items-center gap-3">
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            aria-label="Edit task title"
            className="text-text-lighter min-w-0 bg-transparent text-center text-4xl font-bold drop-shadow-lg outline-none"
            value={titleValue}
            onBlur={saveTitle}
            onChange={(event) => setTitleValue(event.target.value)}
            onKeyDown={handleTitleKeyDown}
          />
        ) : (
          <h2
            className="text-text-lighter text-center text-4xl font-bold drop-shadow-lg"
            onClick={() => setIsEditingTitle(true)}
          >
            {task.title}
          </h2>
        )}
      </div>
      <TaskDescription
        description={task.description}
        editRequestKey={descriptionEditRequestKey}
        saveRequestKey={descriptionSaveRequestKey}
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
