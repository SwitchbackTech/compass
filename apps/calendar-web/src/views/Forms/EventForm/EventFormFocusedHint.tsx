import classNames from "classnames";
import { type ReactNode } from "react";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";

/** Absolutely positioned keycap row beside a schedule control. */
export function EventFormFocusedHint({
  children,
  className,
  pinned = false,
}: {
  children: ReactNode;
  className?: string;
  /** Keep visible while a portaled picker layer is open. */
  pinned?: boolean;
}) {
  return (
    <span
      data-testid="event-form-control-hint"
      className={classNames(
        "pointer-events-none absolute top-full left-0 z-10 mt-1 flex items-center gap-1 whitespace-nowrap text-text-muted text-xs",
        pinned
          ? "visible opacity-100"
          : "invisible opacity-0 transition-opacity group-focus-within/control:visible group-focus-within/control:opacity-100",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EventFormHintSeparator() {
  return (
    <span aria-hidden className="text-text-muted">
      ·
    </span>
  );
}

export function EventFormHintKeys({
  keys,
  label,
}: {
  keys: string | string[];
  label: string;
}) {
  return (
    <>
      <span className="sr-only">{label}</span>
      <ShortcutKeys keys={keys} />
    </>
  );
}
