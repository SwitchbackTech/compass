import {
  ArrowCircleLeft,
  ArrowCircleRight,
  CheckCircle,
} from "@phosphor-icons/react";
import { Task } from "@web/common/types/task.types";

interface FocusedTaskProps {
  task: Task;
  onCompleteTask: () => void;
  onPreviousTask: () => void;
  onNextTask: () => void;
}

export const FocusedTask = ({
  task,
  onCompleteTask,
  onPreviousTask,
  onNextTask,
}: FocusedTaskProps) => {
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
            className="cursor-pointer rounded-full p-1 transition-all duration-200 hover:bg-white/10 hover:shadow-lg hover:shadow-white/20 focus:bg-white/10 focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent focus:outline-none"
          >
            <CheckCircle size={40} className="text-white" />
          </button>
          <button
            onClick={onPreviousTask}
            aria-label="Previous task"
            className="cursor-pointer rounded-full p-1 transition-all duration-200 hover:bg-white/10 hover:shadow-lg hover:shadow-white/20 focus:bg-white/10 focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent focus:outline-none"
          >
            <ArrowCircleLeft size={40} className="text-white" />
          </button>
          <button
            onClick={onNextTask}
            aria-label="Next task"
            className="cursor-pointer rounded-full p-1 transition-all duration-200 hover:bg-white/10 hover:shadow-lg hover:shadow-white/20 focus:bg-white/10 focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent focus:outline-none"
          >
            <ArrowCircleRight size={40} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
