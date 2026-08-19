import { type FC } from "react";
import { type CalendarConnectionBannerKind } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";

const COPY: Record<
  CalendarConnectionBannerKind,
  { message: string; action: string }
> = {
  reconnect: {
    message: "Google Calendar needs reconnecting.",
    action: "Reconnect",
  },
  importFailed: {
    message: "Couldn't add your calendar.",
    action: "Retry",
  },
  delayed: {
    message: "Calendar updates are delayed.",
    action: "Refresh",
  },
};

interface CalendarConnectionBannerProps {
  kind: CalendarConnectionBannerKind;
  onAction: () => void;
}

export const CalendarConnectionBanner: FC<CalendarConnectionBannerProps> = ({
  kind,
  onAction,
}) => {
  const { message, action } = COPY[kind];
  const isError = kind === "reconnect" || kind === "importFailed";

  return (
    <div
      className={`flex items-center justify-between gap-3 border-b px-4 py-2 text-sm ${
        isError
          ? "border-error/40 bg-error/10 text-text"
          : "border-warning/40 bg-warning/10 text-text"
      }`}
      role="status"
    >
      <p>{message}</p>
      <button
        className="c-focus-ring shrink-0 rounded-xs px-2 py-1 font-medium text-text hover:bg-surface-overlay"
        onClick={onAction}
        type="button"
      >
        {action}
      </button>
    </div>
  );
};
