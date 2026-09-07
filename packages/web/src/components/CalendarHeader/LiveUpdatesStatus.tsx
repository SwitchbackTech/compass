import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { type FC, useEffect, useState } from "react";
import { reloadLocation } from "@web/common/utils/browser/browser-navigation.util";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { useSseDegradedSince } from "@web/sse/hooks/useSseDegraded";

// Native EventSource retries on its own for transient drops but gives up for
// good once the browser marks it CLOSED. Past this age the badge stops
// implying recovery is imminent and offers the reload that always works.
export const REFRESH_AFTER_DEGRADED_MS = 30_000;

const useRefreshDue = (degradedSinceMs: number | null): boolean => {
  const [due, setDue] = useState(false);

  useEffect(() => {
    if (degradedSinceMs === null) {
      setDue(false);
      return;
    }
    const remainingMs =
      degradedSinceMs + REFRESH_AFTER_DEGRADED_MS - Date.now();
    if (remainingMs <= 0) {
      setDue(true);
      return;
    }
    setDue(false);
    const timer = setTimeout(() => setDue(true), remainingMs);
    return () => clearTimeout(timer);
  }, [degradedSinceMs]);

  return due;
};

/**
 * Header badge for a live-update stream that has been down for 15s+ (see
 * sse.client's degraded window). Clears itself when the stream reopens. After
 * 30s it adds a Refresh control that reloads the page; like
 * UpdateAvailableButton, the tooltip and blocked-click hint name Mod+R
 * because pointer clicks are suppressed in the keyboard-only calendar.
 */
export const LiveUpdatesStatus: FC = () => {
  const degradedSinceMs = useSseDegradedSince();
  const refreshDue = useRefreshDue(degradedSinceMs);

  if (degradedSinceMs === null) return null;

  return (
    <div
      aria-live="polite"
      className="flex shrink-0 items-center gap-2 text-warning text-xs"
      role="status"
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-warning motion-safe:animate-pulse"
      />
      <span>Reconnecting…</span>
      {refreshDue ? (
        <TooltipWrapper
          description="Reload for the latest calendar"
          onClick={reloadLocation}
          shortcut={["Mod", "R"]}
        >
          <button
            aria-label="Refresh"
            className="c-focus-ring inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 font-medium text-text hover:bg-surface-overlay"
            type="button"
          >
            <ArrowClockwiseIcon aria-hidden="true" size={14} />
            Refresh
          </button>
        </TooltipWrapper>
      ) : null}
    </div>
  );
};
