import { useEffect } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";

interface Props {
  eventsCount?: number;
  calendarsCount?: number;
  localEventsSynced?: number;
  onDismiss: () => void;
}

export const CalendarImportCompleteModal = ({
  eventsCount,
  calendarsCount,
  localEventsSynced,
  onDismiss,
}: Props) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 8000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const formatMessage = () => {
    const lines = [];

    // Google Calendar import line
    const importParts = [];
    if (eventsCount !== undefined) {
      importParts.push(`${eventsCount} event${eventsCount !== 1 ? "s" : ""}`);
    }
    if (calendarsCount !== undefined) {
      importParts.push(
        `${calendarsCount} calendar${calendarsCount !== 1 ? "s" : ""}`,
      );
    }
    if (importParts.length > 0) {
      lines.push(`Imported ${importParts.join(" from ")}`);
    }

    // Local events sync line
    if (localEventsSynced !== undefined && localEventsSynced > 0) {
      lines.push(
        `${localEventsSynced} local event${localEventsSynced !== 1 ? "s" : ""} synced to the cloud`,
      );
    }

    if (lines.length === 0) {
      return "Your calendar has been synced successfully!";
    }

    return lines.join("\n");
  };

  return (
    <OverlayPanel
      icon={
        <CheckCircleIcon
          size={48}
          className="text-status-success"
          weight="fill"
        />
      }
      title="Calendar Import Complete"
      message={formatMessage()}
      onDismiss={onDismiss}
    >
      <button
        onClick={onDismiss}
        className="bg-fg-primary-dark text-text-lighter focus:outline-fg-primary-dark cursor-pointer rounded-sm border-none px-6 py-2 text-sm transition-all hover:brightness-110 focus:outline-2 focus:outline-offset-2"
      >
        Dismiss
      </button>
    </OverlayPanel>
  );
};
