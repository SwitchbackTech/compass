import { useState } from "react";
import { copyText } from "@web/common/utils/clipboard/clipboard.util";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";

interface BookingCopyLinkProps {
  bookingUrl: string;
}

export function BookingCopyLink({ bookingUrl }: BookingCopyLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void copyText(bookingUrl).then((didCopy) => {
      if (!didCopy) {
        showStatusToast(
          "booking-link-copied",
          "Could not copy. Select the link to copy it.",
        );
        return;
      }
      setCopied(true);
      showStatusToast("booking-link-copied", "Booking link copied");
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

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
          onClick={handleCopy}
          type="button"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
