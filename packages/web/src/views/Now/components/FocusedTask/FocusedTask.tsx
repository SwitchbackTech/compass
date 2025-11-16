import { useState } from "react";
import {
  ArrowCircleLeftIcon,
  ArrowCircleRightIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
import { Task } from "@web/common/types/task.types";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";

interface FocusedTaskProps {
  task: Task;
  onCompleteTask: () => void;
  onPreviousTask: () => void;
  onNextTask: () => void;
}

interface ButtonWithShortcutProps {
  onClick: () => void;
  ariaLabel: string;
  shortcut: string;
  children: React.ReactNode;
}

const ButtonWithShortcut = ({
  onClick,
  ariaLabel,
  shortcut,
  children,
}: ButtonWithShortcutProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const showShortcut = isHovered || isFocused;

  return (
    <div className="relative inline-block">
      <button
        onClick={onClick}
        aria-label={ariaLabel}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="cursor-pointer rounded-full p-1 transition-all duration-200 hover:bg-white/10 hover:shadow-lg hover:shadow-white/20 focus:bg-white/10 focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent focus:outline-none"
      >
        {children}
      </button>
      {showShortcut && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 transform">
          <ShortcutHint>{shortcut}</ShortcutHint>
        </div>
      )}
    </div>
  );
};

export const FocusedTask = ({
  task,
  onCompleteTask,
  onPreviousTask,
  onNextTask,
}: FocusedTaskProps) => {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-4xl font-bold text-white drop-shadow-lg">
            {task.title}
          </h2>
        </div>
        <div className="flex items-center justify-center gap-3">
          <ButtonWithShortcut
            onClick={onCompleteTask}
            ariaLabel="Mark task as complete"
            shortcut="Enter"
          >
            <CheckCircleIcon size={40} className="text-white" />
          </ButtonWithShortcut>
          <ButtonWithShortcut
            onClick={onPreviousTask}
            ariaLabel="Previous task"
            shortcut="j"
          >
            <ArrowCircleLeftIcon size={40} className="text-white" />
          </ButtonWithShortcut>
          <ButtonWithShortcut
            onClick={onNextTask}
            ariaLabel="Next task"
            shortcut="k"
          >
            <ArrowCircleRightIcon size={40} className="text-white" />
          </ButtonWithShortcut>
        </div>
      </div>
    </div>
  );
};
