import { type ReactNode, useEffect, useRef } from "react";
import {
  bookingFieldAttrs,
  bookingJumpKeys,
} from "@web/booking/booking-sequence.fields";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";

export const BOOKING_MORE_OPTIONS_LABEL = "More options";

interface BookingMoreOptionsProps {
  children: ReactNode;
  forceOpen?: boolean;
  showShortcuts?: boolean;
}

export function BookingMoreOptions({
  children,
  forceOpen = false,
  showShortcuts = false,
}: BookingMoreOptionsProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (forceOpen && detailsRef.current) {
      detailsRef.current.open = true;
    }
  }, [forceOpen]);

  return (
    <details className="flex flex-col gap-4" ref={detailsRef}>
      <summary
        className="c-focus-ring cursor-pointer list-inside font-medium text-sm text-text"
        {...bookingFieldAttrs("more")}
      >
        {BOOKING_MORE_OPTIONS_LABEL}
        {showShortcuts ? (
          <ShortcutKeys className="ml-1" keys={bookingJumpKeys("more")} />
        ) : null}
      </summary>
      <div className="mt-3 flex flex-col gap-4">{children}</div>
    </details>
  );
}
