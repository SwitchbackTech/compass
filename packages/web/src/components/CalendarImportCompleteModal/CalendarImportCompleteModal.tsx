import { useEffect } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react";

interface Props {
  eventsCount?: number;
  calendarsCount?: number;
  onDismiss: () => void;
}

export const CalendarImportCompleteModal = ({
  eventsCount,
  calendarsCount,
  onDismiss,
}: Props) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 8000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const formatMessage = () => {
    const parts = [];
    if (eventsCount !== undefined) {
      parts.push(`${eventsCount} event${eventsCount !== 1 ? "s" : ""}`);
    }
    if (calendarsCount !== undefined) {
      parts.push(
        `${calendarsCount} calendar${calendarsCount !== 1 ? "s" : ""}`,
      );
    }

    if (parts.length === 0) {
      return "Your calendar has been synced successfully!";
    }

    return `Successfully imported ${parts.join(" from ")}`;
  };

  return (
    <div
      className="bg-bg-primary/50 fixed inset-0 z-[1000] flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onDismiss();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onDismiss();
        }
      }}
      role="presentation"
      tabIndex={-1}
    >
      <div
        className="bg-panel-bg flex max-w-[400px] flex-col items-center gap-6 rounded-xl p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]"
        role="dialog"
        aria-modal="true"
      >
        <CheckCircleIcon
          size={48}
          className="text-status-success"
          weight="fill"
        />
        <h2 className="text-text-light m-0 text-center text-2xl font-semibold">
          Calendar Import Complete
        </h2>
        <p className="text-text-lighter m-0 text-center text-base">
          {formatMessage()}
        </p>
        <button
          onClick={onDismiss}
          className="bg-accent-primary text-text-lighter focus:outline-accent-primary cursor-pointer rounded-md border-none px-6 py-2 text-sm font-medium transition-all hover:brightness-110 focus:outline focus:outline-2 focus:outline-offset-2"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
