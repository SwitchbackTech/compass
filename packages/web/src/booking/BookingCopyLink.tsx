import { useCopiedFlag } from "@web/booking/use-copied-flag";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";

interface BookingCopyLinkProps {
  bookingUrl: string;
}

export function BookingCopyLink({ bookingUrl }: BookingCopyLinkProps) {
  const { copied, copy } = useCopiedFlag(bookingUrl, (didCopy) => {
    showStatusToast(
      "booking-link-copied",
      didCopy
        ? "Booking link copied"
        : "Could not copy. Select the link to copy it.",
    );
  });

  return (
    <div>
      <p className="mb-1 text-sm text-text">Public booking link</p>
      <div className="flex items-center gap-2">
        <input
          aria-label="Public booking link"
          className="c-focus-ring min-w-0 flex-1 rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text"
          readOnly
          value={bookingUrl}
        />
        <button
          aria-label="Copy booking link"
          className="c-focus-ring shrink-0 rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text transition-colors hover:bg-surface-panel"
          onClick={copy}
          type="button"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <a
          className="c-focus-ring shrink-0 rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text transition-colors hover:bg-surface-panel"
          href={bookingUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open booking page
        </a>
      </div>
    </div>
  );
}
