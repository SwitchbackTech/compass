import React from "react";
import { Trash } from "@phosphor-icons/react";
import { useTasks } from "../../hooks/tasks/useTasks";
import { Task } from "../../task.types";

interface TaskContextMenuItemsProps {
  task: Task;
  close: () => void;
}

export function TaskContextMenuItems({
  task,
  close,
}: TaskContextMenuItemsProps) {
  const { deleteTask } = useTasks();

  const handleDelete = () => {
    deleteTask(task.id);
    close();
  };

  return (
    <li
      onClick={handleDelete}
      className="flex cursor-pointer items-center gap-2 border-b border-gray-600 px-3 py-2.5 text-sm text-gray-200 last:border-b-0 hover:bg-gray-700"
    >
      <Trash size={16} className="text-gray-300" />
      <span>Delete Task</span>
    </li>
  );
}
