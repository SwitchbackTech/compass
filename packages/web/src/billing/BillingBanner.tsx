import { type FC } from "react";

type BillingBannerProps = {
  message: string;
  ctaLabel: string;
  disabled?: boolean;
  onCta: () => void;
};

/**
 * The non-blocking billing notice. `data-notice` is what the notice-focus
 * shortcut scans for, so it belongs here rather than in each caller.
 */
export const BillingBanner: FC<BillingBannerProps> = ({
  message,
  ctaLabel,
  disabled = false,
  onCta,
}) => {
  return (
    <div
      className="flex items-center justify-center gap-3 border-warning/40 border-b bg-warning/10 px-4 py-2 text-sm text-text"
      data-notice=""
      role="status"
    >
      <p>{message}</p>
      <button
        className="c-focus-ring font-medium text-warning underline-offset-4 hover:underline"
        disabled={disabled}
        onClick={onCta}
        type="button"
      >
        {ctaLabel}
      </button>
    </div>
  );
};
