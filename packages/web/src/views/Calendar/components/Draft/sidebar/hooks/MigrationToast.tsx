import React from "react";
import { toast } from "react-toastify";
import { toastDefaultOptions } from "@web/common/constants/toast.constants";

interface Props {
  targetMonthName: string;
  onGoToMonth: () => void;
}

const MigrationToastComponent: React.FC<Props> = ({
  targetMonthName,
  onGoToMonth,
}) => {
  return (
    <div>
      <div>Event migrated to {targetMonthName}</div>
      <button
        onClick={() => {
          onGoToMonth();
          toast.dismiss();
        }}
        style={{
          marginTop: "8px",
          padding: "4px 8px",
          background: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Go to {targetMonthName}
      </button>
    </div>
  );
};

// Export a function that can be called from .ts files
export const showMigrationToast = (
  targetMonthName: string,
  onGoToMonth: () => void,
) => {
  toast(
    <MigrationToastComponent
      targetMonthName={targetMonthName}
      onGoToMonth={onGoToMonth}
    />,
    toastDefaultOptions,
  );
};
