import { ArrowSquareOut, Check, Copy } from "@phosphor-icons/react";
import { useCopiedFlag } from "@web/booking/use-copied-flag";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import IconButton, {
  iconButtonClassName,
} from "@web/components/IconButton/IconButton";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

interface BookingCopyLinkProps {
  bookingUrl: string;
}

const ICON_SIZE = 18;

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
      <div className="flex items-center gap-1">
        <input
          aria-label="Public booking link"
          className="c-focus-ring min-w-0 flex-1 rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text"
          readOnly
          value={bookingUrl}
        />
        <TooltipWrapper description={copied ? "Copied" : "Copy booking link"}>
          <IconButton
            aria-label="Copy booking link"
            onClick={copy}
            size="small"
          >
            {copied ? <Check size={ICON_SIZE} /> : <Copy size={ICON_SIZE} />}
          </IconButton>
        </TooltipWrapper>
        <TooltipWrapper description="Open booking page">
          <a
            aria-label="Open booking page"
            className={iconButtonClassName("small")}
            href={bookingUrl}
            rel="noreferrer"
            target="_blank"
          >
            <ArrowSquareOut size={ICON_SIZE} />
          </a>
        </TooltipWrapper>
      </div>
    </div>
  );
}
