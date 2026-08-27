import { type FC } from "react";
import { BillingBanner } from "@web/billing/BillingBanner";
import { useBillingRedirect } from "@web/billing/useBillingRedirect";

/**
 * Shown while a gated user is looking around the real calendar. Writes still
 * fail server-side; this is the standing reminder of why, plus the way out.
 */
export const BillingReadOnlyBanner: FC = () => {
  const { isRedirecting, redirectTo } = useBillingRedirect();

  return (
    <BillingBanner
      ctaLabel="Start your free 7-day trial to save changes"
      disabled={isRedirecting}
      message="You're looking around in read-only mode."
      onCta={() => void redirectTo("checkout", "banner_checkout")}
    />
  );
};
