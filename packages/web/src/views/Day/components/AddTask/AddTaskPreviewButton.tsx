import { ID_ADD_TASK_BUTTON } from "@web/common/constants/web.constants";
import { PlusIcon } from "../Icons/PlusIcon";
import { ShortcutTip } from "../Shortcuts/ShortcutTip";

interface AddTaskPreviewButtonProps {
  onBeginAddingTask: () => void;
  isHoveringAddBlock: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function AddTaskPreviewButton({
  onBeginAddingTask,
  isHoveringAddBlock,
  onMouseEnter,
  onMouseLeave,
}: AddTaskPreviewButtonProps) {
  return (
    <button
      id={ID_ADD_TASK_BUTTON}
      type="button"
      className="group flex w-full cursor-pointer items-start gap-3 rounded border border-gray-400/30 bg-gray-400/5 p-2 text-left transition-colors hover:border-blue-200/30 hover:bg-blue-200/5 focus:border-blue-200/50 focus:bg-blue-200/10 focus:ring-2 focus:ring-blue-200/30 focus:outline-none"
      onClick={onBeginAddingTask}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label="Create new task"
    >
      <PlusIcon
        className="h-4 w-4 text-gray-200 transition-colors group-hover:text-blue-200 group-focus:text-blue-200"
        aria-hidden={true}
      />
      <div className="flex flex-1 items-center justify-between">
        <span className="group-hover:text-white-100 group-focus:text-white-100 text-sm text-gray-200 transition-colors">
          Create task
        </span>
        {isHoveringAddBlock && (
          <ShortcutTip shortcut="C" aria-label="Press C to create task" />
        )}
      </div>
    </button>
  );
}
