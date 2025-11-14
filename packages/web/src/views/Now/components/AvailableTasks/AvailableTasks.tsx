import { Task } from "@web/views/Day/task.types";

interface AvailableTasksProps {
  tasks: Task[];
  onSelectTask: (taskId: string) => void;
}

export const AvailableTasks = ({
  tasks,
  onSelectTask,
}: AvailableTasksProps) => {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-lg text-white/70">No tasks available</p>
        <p className="text-sm text-white/50">
          Create tasks in the Day view to focus on them here
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <h3 className="mb-2 text-xl font-semibold text-white">
        Select a task to focus on
      </h3>
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
            onClick={() => onSelectTask(task.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onSelectTask(task.id);
              }
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg text-white">{task.title}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
