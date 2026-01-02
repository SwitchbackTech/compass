import classNames from "classnames";
import { UseFloatingReturn } from "@floating-ui/react";
import { DotsSixVerticalIcon } from "@phosphor-icons/react";
import { Task } from "@web/common/types/task.types";
import { DNDChildProps } from "@web/components/DND/Draggable";

interface DraggableTaskHandleProps {
  task: Task;
  index: number;
  tasksLength: number;
  isDragging: boolean;
  listeners: DNDChildProps["listeners"];
  refs: UseFloatingReturn["refs"];
  floatingStyles: React.CSSProperties;
  onFocus: (index: number) => void;
}

export function DraggableTaskHandle({
  task,
  index,
  tasksLength,
  isDragging,
  listeners,
  refs,
  floatingStyles,
  onFocus,
}: DraggableTaskHandleProps) {
  if (tasksLength <= 1) return null;

  return (
    <button
      {...(listeners ?? {})}
      ref={refs.setFloating}
      style={floatingStyles}
      aria-label={`Reorder ${task.title}`}
      aria-describedby={`description-${task.id}`}
      onFocus={() => onFocus(index)}
      className={classNames(
        "opacity-0",
        "hover:bg-border-primary hover:cursor-grab",
        "rounded-xs py-2 transition-colors",
        "group-hover:opacity-100 hover:opacity-100 focus:opacity-100",
        "max-w-48 text-white",
        "focus:bg-white/20 focus:ring-2 focus:ring-white/50",
        "focus:outline-none disabled:cursor-default disabled:opacity-0",
        {
          "opacity-100": isDragging,
        },
      )}
    >
      <DotsSixVerticalIcon size={24} />
    </button>
  );
}
