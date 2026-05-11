import type React from "react";
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
        className="mt-2 cursor-pointer rounded-default border-none bg-accent-primary px-2 py-1 text-bg-primary transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        onClick={() => {
          onGoToMonth();
          toast.dismiss();
        }}
        type="button"
      >
        Go to {targetMonthName}
      </button>
    </div>
  );
};

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
