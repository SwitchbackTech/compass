import { useMemo } from "react";
import { Priorities } from "@core/constants/core.constants";
import { useTasks } from "@web/views/Day/hooks/tasks/useTasks";
import { getPriorityBgColor } from "@web/views/Now/utils/get-priority-bg-color";

export function AvailableTasks() {
  const { tasks, selectTask, selectedTask } = useTasks();

  if (selectedTask) return null;

  const uncompletedTasks = useMemo(
    () => tasks.filter((task) => task.status !== "completed"),
    [tasks],
  );

  if (uncompletedTasks.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-2xl px-8">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-medium">No tasks to focus on</h1>
            <p className="mb-6 text-gray-400">All your tasks are completed!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-2xl px-8">
        <div className="text-center">
          <h1 className="mb-8 text-3xl font-medium text-white">
            Choose a task to focus on
          </h1>

          <div className="space-y-3">
            {uncompletedTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => selectTask(task.id)}
                className={`group w-full cursor-pointer rounded-lg border p-4 text-left transition-all ${getPriorityBgColor(
                  Priorities.UNASSIGNED,
                )} ${
                  task.id === selectedTask
                    ? "scale-[1.02] ring-2 ring-blue-400"
                    : "hover:bg-opacity-80 hover:scale-[1.01]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`transition-colors ${
                      task.id === selectedTask
                        ? "text-blue-400"
                        : "text-white group-hover:text-blue-400"
                    }`}
                  >
                    {task.title}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-6 text-sm text-gray-400">
            Use ↑↓ arrow keys and Enter to select
          </div>
        </div>
      </div>
    </div>
  );
}
