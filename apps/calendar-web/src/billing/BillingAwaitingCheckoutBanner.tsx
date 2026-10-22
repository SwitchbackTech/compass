import { type FC, useCallback, useState } from "react";
import { track } from "@web/auth/posthog/track";
import {
  dismissAwaitingCheckoutBannerForSession,
  isAwaitingCheckoutBannerDismissedForSession,
} from "@web/billing/awaiting-checkout-banner.util";
import { BillingBanner } from "@web/billing/BillingBanner";
import { requestTrialStep } from "@web/billing/trial-step-request";
import { START_TRIAL_SHORTCUT_KEY } from "@web/shortcuts/notice-focus/useNoticeActionShortcut";

/**
 * Non-blocking nudge while the account is read-only `awaiting_checkout`.
 * Writes and shortcuts open the trial step; this banner is the calm opt-in.
 * Dismiss hides it for this browser tab session only.
 */
export const BillingAwaitingCheckoutBanner: FC = () => {
  const [dismissed, setDismissed] = useState(
    isAwaitingCheckoutBannerDismissedForSession,
  );

  const dismiss = useCallback(() => {
    dismissAwaitingCheckoutBannerForSession();
    setDismissed(true);
  }, []);

  if (dismissed) {
    return null;
  }

  return (
    <BillingBanner
      ctaLabel="Start free trial"
      dismissLabel="Dismiss"
      message="Start your 7-day free trial to plan your week."
      onCta={() => {
        track("billing_gate_cta_clicked", { cta: "explore_banner" });
        void requestTrialStep({ trigger: "banner" });
      }}
      onDismiss={dismiss}
      shortcutKey={START_TRIAL_SHORTCUT_KEY}
    />
  );
};
