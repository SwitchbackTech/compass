import { TrashIcon } from "@phosphor-icons/react";
import { Task } from "@web/common/types/task.types";
import { useTasks } from "@web/views/Day/hooks/tasks/useTasks";

interface Props {
  task: Task;
  close: () => void;
}

export function TaskContextMenuItems({ task, close }: Props) {
  const { deleteTask } = useTasks();

  const handleDelete = () => {
    deleteTask(task._id);
    close();
  };

  return (
    <li className="border-bg-secondary bg-bg-primary text-text-light hover:bg-bg-secondary hover:text-text-lighter border-b last:border-b-0">
      <button
        onClick={handleDelete}
        className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2.5 text-left text-sm"
      >
        <TrashIcon size={16} />
        <span>Delete Task</span>
      </button>
    </li>
  );
}
