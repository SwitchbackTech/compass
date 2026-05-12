import type React from "react";
import { toast } from "react-toastify";
import { toastDefaultOptions } from "@web/common/constants/toast.constants";
import { getModifierKeyIcon } from "@web/common/utils/shortcut/shortcut.util";

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
        type="button"
        onClick={handleUndo}
        className="flex cursor-pointer flex-col gap-1 text-left"
      >
        <span className="text-sm text-white">{message}</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-300 text-xs">Undo</span>
          <div className="flex items-center gap-1 rounded bg-gray-700 px-1.5 py-0.5 text-gray-200 text-xs">
            {getModifierKeyIcon({ size: 12 })}
            <span>+ Z</span>
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={onNavigate}
        className="whitespace-nowrap rounded bg-bg-secondary px-3 py-1 text-text-lighter text-xs transition-colors hover:bg-accent-primary hover:text-text-dark"
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
    toastDefaultOptions,
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
