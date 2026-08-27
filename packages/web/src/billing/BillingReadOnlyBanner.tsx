import { type FC } from "react";
import { BillingApi } from "@web/api/billing.api";
import { track } from "@web/auth/posthog/track";

/**
 * Shown while a gated user is looking around the real calendar. Writes still
 * fail server-side; this is the standing reminder of why, plus the way out.
 */
export const BillingReadOnlyBanner: FC = () => {
  return (
    <div
      className="flex items-center justify-center gap-3 border-warning/40 border-b bg-warning/10 px-4 py-2 text-sm text-text"
      data-notice=""
      role="status"
    >
      <p>You're looking around in read-only mode.</p>
      <button
        className="c-focus-ring font-medium text-warning underline-offset-4 hover:underline"
        onClick={() => {
          track("billing_gate_cta_clicked", { cta: "checkout" });
          void BillingApi.createCheckoutSession().then(({ url }) => {
            window.location.assign(url);
          });
        }}
        type="button"
      >
        Start your free 7-day trial to save changes
      </button>
    </div>
  );
};
