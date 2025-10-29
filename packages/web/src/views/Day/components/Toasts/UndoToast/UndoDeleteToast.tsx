import React from "react";
import { toast } from "react-toastify";
import { getMetaKey } from "@web/common/utils/shortcut/shortcut.util";

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
export const showUndoDeleteToast = (onRestore: () => void) => {
  const toastId = toast(<UndoDeleteToast onRestore={onRestore} toastId="" />, {
    autoClose: 5000,
    position: "bottom-left",
    closeOnClick: true,
  });

  // Update the component with the actual toast ID
  toast.update(toastId, {
    render: <UndoDeleteToast onRestore={onRestore} toastId={toastId} />,
  });

  return toastId;
};
