import React from "react";
import { toast } from "react-toastify";

interface MigrationToastComponentProps {
  direction: "forward" | "backward";
  onNavigate: () => void;
}

const MigrationToastComponent: React.FC<MigrationToastComponentProps> = ({
  direction,
  onNavigate,
}) => {
  const message = `Migrated ${direction} 1 day.`;

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-white">{message}</span>
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
) => {
  toast(
    <MigrationToastComponent direction={direction} onNavigate={onNavigate} />,
    {
      autoClose: 5000,
      position: "bottom-left",
      closeOnClick: true,
    },
  );
};
