import React from "react";
import { toast } from "react-toastify";
import { getMetaKey } from "@web/common/utils/shortcut/shortcut.util";
import { Task } from "../../task.types";

interface UndoDeleteToastProps {
  onRestore: () => void;
}

export const UndoDeleteToastComponent: React.FC<UndoDeleteToastProps> = ({
  onRestore,
}) => {
  const handleRestore = () => {
    onRestore();
    toast.dismiss();
  };

  return (
    <button
      className="flex w-full cursor-pointer flex-col gap-1 rounded-lg bg-gray-600 p-3 text-left text-white shadow-lg"
      onClick={handleRestore}
    >
      <div className="text-sm font-medium text-white">Deleted</div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-300">Undo</span>
        <div className="flex items-center gap-1 rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-200">
          {getMetaKey({ size: 12 })}
          <span>+ Z</span>
        </div>
      </div>
    </button>
  );
};

// Export a function that can be called from .ts files
export const showUndoDeleteToast = (task: Task, onRestore: () => void) => {
  toast(<UndoDeleteToastComponent onRestore={onRestore} />, {
    autoClose: 5000,
    position: "bottom-left",
    closeOnClick: true,
    onClick: onRestore,
  });
};
