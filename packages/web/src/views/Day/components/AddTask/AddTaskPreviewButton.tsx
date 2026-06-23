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
      className="group flex w-full cursor-pointer items-start gap-3 rounded border border-panel-shadow/30 bg-panel-shadow/5 p-2 text-left transition-colors hover:border-interactive-accent/30 hover:bg-interactive-accent/5 focus:border-interactive-accent/50 focus:bg-interactive-accent/10 focus:outline-none focus:ring-2 focus:ring-interactive-accent/30"
      onClick={onBeginAddingTask}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label="Create new task"
    >
      <PlusIcon
        className="h-4 w-4 text-fg-primary-dark transition-colors group-hover:text-interactive-accent group-focus:text-interactive-accent"
        aria-hidden={true}
      />
      <div className="flex flex-1 items-center justify-between">
        <span className="text-fg-primary-dark text-sm transition-colors group-hover:text-text-lighter group-focus:text-text-lighter">
          Create task
        </span>
        {isHoveringAddBlock && (
          <ShortcutTip shortcut="C" aria-label="Press C to create task" />
        )}
      </div>
    </button>
  );
}
