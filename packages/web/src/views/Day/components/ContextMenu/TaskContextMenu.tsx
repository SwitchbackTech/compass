import { type FloatingContext } from "@floating-ui/react";
import React from "react";
import { type Task } from "../../../../common/types/task.types";
import { BaseContextMenu } from "./BaseContextMenu";
import { TaskContextMenuItems } from "./TaskContextMenuItems";

interface TaskContextMenuProps {
  task: Task;
  onOutsideClick: () => void;
  close: () => void;
  style: React.CSSProperties;
  context: FloatingContext;
}

export const TaskContextMenu = React.forwardRef<
  HTMLUListElement,
  TaskContextMenuProps
>(({ task, onOutsideClick, close, style, context }, ref) => {
  return (
    <BaseContextMenu
      ref={ref}
      onOutsideClick={onOutsideClick}
      style={style}
      context={context}
    >
      <TaskContextMenuItems task={task} close={close} />
    </BaseContextMenu>
  );
});

TaskContextMenu.displayName = "TaskContextMenu";
