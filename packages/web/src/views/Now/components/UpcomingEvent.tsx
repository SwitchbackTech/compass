import { Clock, Coffee } from "@phosphor-icons/react";
import { Schema_WebEvent } from "@web/common/types/web.event.types";

export interface UpcomingEventProps {
  event?: Schema_WebEvent | null;
  starts?: string;
}

export const UpcomingEvent = ({ event, starts }: UpcomingEventProps) => {
  // If there's no event and no starts time, show the "no more events" message
  if (!event && !starts) {
    return (
      <aside
        aria-label="Upcoming event"
        className="fixed top-4 right-4 z-30 flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-gradient-to-br from-slate-800/95 to-slate-900/95 p-4 shadow-xl backdrop-blur-sm"
      >
        <Coffee
          className="h-5 w-5 text-cyan-400"
          weight="duotone"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-cyan-100">
          No more events today. Lock in
        </p>
      </aside>
    );
  }

  // If there's no event but we have a starts time, show loading state
  if (!event) {
    return (
      <aside
        aria-label="Upcoming event"
        className="fixed top-4 right-4 z-30 flex items-center gap-2 rounded-lg border border-white/10 bg-gradient-to-br from-slate-800/95 to-slate-900/95 p-4 shadow-xl backdrop-blur-sm"
      >
        <Clock
          className="h-5 w-5 animate-pulse text-slate-400"
          weight="duotone"
          aria-hidden="true"
        />
        <p className="text-sm text-slate-400">Loading...</p>
      </aside>
    );
  }

  // Determine urgency based on the starts time string
  const isUrgent = starts && starts.includes("minute");
  const isImmediate = starts && starts.includes("second");

  // Select colors based on urgency
  const getUrgencyStyles = () => {
    if (isImmediate) {
      return {
        border: "border-red-400/40",
        bg: "from-red-900/30 to-slate-900/95",
        iconColor: "text-red-400",
        textColor: "text-red-100",
        timeColor: "text-red-300",
      };
    }
    if (isUrgent) {
      return {
        border: "border-amber-400/40",
        bg: "from-amber-900/30 to-slate-900/95",
        iconColor: "text-amber-400",
        textColor: "text-amber-100",
        timeColor: "text-amber-300",
      };
    }
    return {
      border: "border-blue-400/30",
      bg: "from-blue-900/30 to-slate-900/95",
      iconColor: "text-blue-400",
      textColor: "text-blue-100",
      timeColor: "text-blue-300",
    };
  };

  const styles = getUrgencyStyles();

  return (
    <aside
      aria-label="Upcoming event"
      className={`fixed top-4 right-4 z-30 max-w-xs rounded-lg border ${styles.border} bg-gradient-to-br ${styles.bg} p-4 shadow-xl backdrop-blur-sm transition-all duration-300 hover:scale-105 md:max-w-sm`}
    >
      <div className="flex items-start gap-3">
        <Clock
          className={`h-6 w-6 flex-shrink-0 ${styles.iconColor} ${
            isImmediate ? "animate-pulse" : ""
          }`}
          weight="duotone"
          aria-hidden="true"
        />
        <div className="flex-1 space-y-1">
          <p
            className={`text-sm leading-tight font-semibold ${styles.textColor}`}
          >
            {event.title || "Untitled Event"}
          </p>
          {starts && (
            <p
              className={`text-xs font-medium ${styles.timeColor}`}
              aria-live="polite"
            >
              Starts {starts}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
};
