import type React from "react";
import { toast } from "react-toastify";
import { toastDefaultOptions } from "@web/common/constants/toast.constants";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";

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
        <span className="text-gray-300 text-xs">Undo</span>
        <ShortcutKeys keys={["Mod", "Z"]} />
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
