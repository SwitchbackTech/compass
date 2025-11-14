import { Task } from "@web/views/Day/task.types";

interface FocusedTaskProps {
  task: Task;
}

export const FocusedTask = ({ task }: FocusedTaskProps) => {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-4xl font-bold text-white drop-shadow-lg">
            {task.title}
          </h2>
        </div>
      </div>
    </div>
  );
};
