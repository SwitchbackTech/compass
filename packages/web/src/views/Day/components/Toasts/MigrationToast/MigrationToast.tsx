import React from "react";
import { toast } from "react-toastify";
import { getMetaKey } from "@web/common/utils/shortcut/shortcut.util";

interface MigrationToastProps {
  direction: "forward" | "backward";
  onNavigate: () => void;
  onUndo: () => void;
  toastId: string | number;
}

const MigrationToast: React.FC<MigrationToastProps> = ({
  direction,
  onNavigate,
  onUndo,
  toastId,
}) => {
  const message = `Migrated ${direction}.`;

  const handleUndo = () => {
    onUndo();
    toast.dismiss(toastId);
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <button
        onClick={handleUndo}
        className="flex cursor-pointer flex-col gap-1 text-left"
      >
        <span className="text-sm text-white">{message}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-300">Undo</span>
          <div className="flex items-center gap-1 rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-200">
            {getMetaKey({ size: 12 })}
            <span>+ Z</span>
          </div>
        </div>
      </button>
      <button
        onClick={onNavigate}
        className="rounded bg-blue-500 px-3 py-1 text-xs whitespace-nowrap text-white transition-colors hover:bg-blue-600"
      >
        Go to day
      </button>
    </div>
  );
};

export const showMigrationToast = (
  direction: "forward" | "backward",
  onNavigate: () => void,
  onUndo: () => void,
) => {
  const toastId = toast(
    <MigrationToast
      direction={direction}
      onNavigate={onNavigate}
      onUndo={onUndo}
      toastId=""
    />,
    {
      autoClose: 5000,
      position: "bottom-left",
      closeOnClick: true,
    },
  );

  // Update the component with the actual toast ID
  toast.update(toastId, {
    render: (
      <MigrationToast
        direction={direction}
        onNavigate={onNavigate}
        onUndo={onUndo}
        toastId={toastId}
      />
    ),
  });

  return toastId;
};
