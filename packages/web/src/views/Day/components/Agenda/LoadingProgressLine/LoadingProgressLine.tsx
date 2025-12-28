import classNames from "classnames";

/**
 * Loading progress line component that shows at the top of the timedEvents section (ID_GRID_EVENTS_TIMED)
 * during subsequent event reloads. Displays an animated color-transitioning
 * line that indicates loading state without obstructing the user's view.
 */
export function LoadingProgressLine() {
  return (
    <div
      data-testid="loading-progress-line"
      className={classNames(
        "h-0.5 w-full",
        "bg-linear-to-r/longer from-gray-500 to-gray-300",
        "motion-safe:animate-progress-slide",
      )}
    />
  );
}
