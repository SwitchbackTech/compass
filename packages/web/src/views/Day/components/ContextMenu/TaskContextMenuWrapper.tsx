import React, { useState } from "react";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { Task } from "../../../../common/types/task.types";
import { useTasks } from "../../hooks/tasks/useTasks";
import { getTaskIdFromElement } from "../../util/task.locate";
import { TaskContextMenu } from "./TaskContextMenu";

interface TaskItemsWrapperProps {
  children: React.ReactNode;
}

export const TaskContextMenuWrapper = ({ children }: TaskItemsWrapperProps) => {
  const { tasks } = useTasks();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { refs, x, y, context } = useFloating({
    placement: "right-start",
    middleware: [offset(5), flip(), shift()],
    open: isOpen,
    onOpenChange(newIsOpen, _, reason) {
      setIsOpen(newIsOpen);
      if (newIsOpen === false && reason === "escape-key") {
        handleClose();
      }
    },
    whileElementsMounted: autoUpdate,
  });

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) {
      console.error("target is not a HTMLElement");
      return;
    }

    // Get task ID from data attribute
    const taskId = getTaskIdFromElement(target);
    if (!taskId) {
      return;
    }

    // Find the task by ID
    const task = tasks.find((t) => t._id === taskId);
    if (!task) {
      return;
    }

    e.preventDefault();

    // Create a virtual element where the user clicked
    refs.setReference({
      getBoundingClientRect: () => ({
        x: e.clientX,
        y: e.clientY,
        top: e.clientY,
        left: e.clientX,
        bottom: e.clientY,
        right: e.clientX,
        width: 0,
        height: 0,
        toJSON: () => ({}),
      }),
    });

    setSelectedTask(task);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedTask(null);
  };

  return (
    <div style={{ display: "contents" }} onContextMenu={handleContextMenu}>
      {children}
      {isOpen && selectedTask && (
        <TaskContextMenu
          ref={refs.setFloating}
          task={selectedTask}
          style={{
            position: "absolute",
            top: `${y}px`,
            left: `${x}px`,
          }}
          context={context}
          close={handleClose}
          onOutsideClick={handleClose}
        />
      )}
    </div>
  );
};
