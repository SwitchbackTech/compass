import {
  ArrowCircleLeft,
  ArrowCircleRight,
  CheckCircle,
} from "@phosphor-icons/react";
import { Task } from "@web/views/Day/task.types";

interface FocusedTaskProps {
  task: Task;
  onCompleteTask: () => void;
}

export const FocusedTask = ({ task, onCompleteTask }: FocusedTaskProps) => {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-4xl font-bold text-white drop-shadow-lg">
            {task.title}
          </h2>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onCompleteTask}
            aria-label="Mark task as complete"
            className="cursor-pointer rounded transition-opacity hover:opacity-80 focus:ring-2 focus:ring-white/50 focus:outline-none"
          >
            <CheckCircle size={40} className="text-white" />
          </button>
          <ArrowCircleLeft size={40} className="text-white" />
          <ArrowCircleRight size={40} className="text-white" />
        </div>
      </div>
    </div>
  );
};
