import { type FC } from "react";
import { BillingBanner } from "@web/billing/BillingBanner";
import { useBillingRedirect } from "@web/billing/useBillingRedirect";

/**
 * Non-blocking banner during Stripe's dunning window. The account stays
 * writable; this is the only past_due UI.
 */
export const BillingPastDueBanner: FC = () => {
  const { isRedirecting, redirectTo } = useBillingRedirect();

  return (
    <BillingBanner
      ctaLabel="Manage billing"
      disabled={isRedirecting}
      message="Payment failed. Update your card to keep Compass after this period."
      onCta={() => void redirectTo("portal", "past_due_portal")}
    />
  );
};
