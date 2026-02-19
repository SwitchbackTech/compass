import { Task } from "@web/common/types/task.types";

interface AvailableTasksProps {
  tasks: Task[];
  onTaskSelect: (taskId: string) => void;
}

export const AvailableTasks = ({
  tasks,
  onTaskSelect,
}: AvailableTasksProps) => {
  return (
    <div className="flex flex-1 flex-col items-center gap-6">
      <div className="flex flex-1 flex-col items-center gap-4">
        <p className="text-2xl font-semibold text-white">
          Select a task to focus on
        </p>
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <button
              key={task._id}
              onClick={() => onTaskSelect(task._id)}
              aria-label={`Select ${task.title}`}
              className="rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-white transition-colors hover:bg-white/10 focus:ring-2 focus:ring-white/50 focus:outline-none"
            >
              {task.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
