import type React from "react";
import { toast } from "react-toastify";
import { toastDefaultOptions } from "@web/common/constants/toast.constants";
import { getModifierKeyIcon } from "@web/common/utils/shortcut/shortcut.util";

interface UndoProps {
  onRestore: () => void;
  toastId: string | number;
}

export const UndoDeleteToast: React.FC<UndoProps> = ({
  onRestore,
  toastId,
}) => {
  const handleRestore = () => {
    onRestore();
    toast.dismiss(toastId);
  };

  return (
    <button
      type="button"
      className="flex w-full cursor-pointer flex-col gap-1 p-3 text-left"
      onClick={handleRestore}
    >
      <div className="font-medium text-sm text-white">Deleted</div>
      <div className="flex items-center gap-2">
        <span className="text-text-dark-placeholder text-xs">Undo</span>
        <div className="flex items-center gap-1 rounded bg-kbd-bg px-1.5 py-0.5 text-fg-primary-dark text-xs">
          {getModifierKeyIcon({ size: 12 })}
          <span>+ Z</span>
        </div>
      </div>
    </button>
  );
};

// Export a function that can be called from .ts files
export const showUndoDeleteToast = (onRestore: () => void) => {
  const toastId = toast(
    <UndoDeleteToast onRestore={onRestore} toastId="" />,
    toastDefaultOptions,
  );

  // Update the component with the actual toast ID
  toast.update(toastId, {
    render: <UndoDeleteToast onRestore={onRestore} toastId={toastId} />,
  });

  return toastId;
};
