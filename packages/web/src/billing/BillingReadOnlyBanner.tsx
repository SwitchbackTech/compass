import { type FC } from "react";
import { BillingBanner } from "@web/billing/BillingBanner";
import { useBillingRedirect } from "@web/billing/useBillingRedirect";
import { POINTER_ACTIONS } from "@web/shortcuts/keyboard-only/pointer-action";
import { START_TRIAL_SHORTCUT_KEY } from "@web/shortcuts/notice-focus/useNoticeActionShortcut";

/**
 * Shown while a gated user is looking around the real calendar. Writes still
 * fail server-side; this is the standing reminder of why, plus the way out.
 * `S` matches the billing-gate Start trial binding so look-around keeps the
 * same key after the overlay unmounts.
 */
export const BillingReadOnlyBanner: FC = () => {
  const { isRedirecting, redirectTo } = useBillingRedirect();

  return (
    <BillingBanner
      ctaLabel="Start your free 7-day trial to save changes"
      disabled={isRedirecting}
      message="You're looking around in read-only mode."
      onCta={() => void redirectTo("checkout", "banner_checkout")}
      pointerAction={POINTER_ACTIONS.startTrial}
      shortcutKey={START_TRIAL_SHORTCUT_KEY}
    />
  );
};
