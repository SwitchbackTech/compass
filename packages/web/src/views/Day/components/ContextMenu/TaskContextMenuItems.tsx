import { Trash } from "@phosphor-icons/react";
import { Task } from "../../../../common/types/task.types";
import { useTasks } from "../../hooks/tasks/useTasks";

interface Props {
  task: Task;
  close: () => void;
}

export function TaskContextMenuItems({ task, close }: Props) {
  const { deleteTask } = useTasks();

  const handleDelete = () => {
    deleteTask(task.id);
    close();
  };

  return (
    <li className="border-b border-gray-600 last:border-b-0">
      <button
        onClick={handleDelete}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-200 hover:bg-gray-700"
      >
        <Trash size={16} className="text-gray-300" />
        <span>Delete Task</span>
      </button>
    </li>
  );
}
