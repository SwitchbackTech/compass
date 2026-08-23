import { type FC } from "react";
import { BillingApi } from "@web/api/billing.api";

/**
 * Non-blocking banner during Stripe's dunning window. The account stays
 * writable; this is the only past_due UI.
 */
export const BillingPastDueBanner: FC = () => {
  return (
    <div
      className="flex items-center justify-center gap-3 border-warning/40 border-b bg-warning/10 px-4 py-2 text-sm text-text"
      data-notice=""
      role="status"
    >
      <p>Payment failed. Update your card to keep Compass after this period.</p>
      <button
        className="c-focus-ring font-medium text-warning underline-offset-4 hover:underline"
        onClick={() => {
          void BillingApi.createPortalSession().then(({ url }) => {
            window.location.assign(url);
          });
        }}
        type="button"
      >
        Manage billing
      </button>
    </div>
  );
};
