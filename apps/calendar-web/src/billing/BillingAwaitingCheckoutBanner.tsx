import { type FC } from "react";
import { track } from "@web/auth/posthog/track";
import { BillingBanner } from "@web/billing/BillingBanner";
import { requestTrialStep } from "@web/billing/trial-step-request";
import { START_TRIAL_SHORTCUT_KEY } from "@web/shortcuts/notice-focus/useNoticeActionShortcut";

/**
 * Non-blocking nudge while the account is read-only `awaiting_checkout`.
 * Writes and shortcuts open the trial step; this banner is the calm opt-in.
 */
export const BillingAwaitingCheckoutBanner: FC = () => {
  return (
    <BillingBanner
      ctaLabel="Start free trial"
      message="Start your 7-day free trial to plan your week."
      onCta={() => {
        track("billing_gate_cta_clicked", { cta: "explore_banner" });
        void requestTrialStep({ trigger: "banner" });
      }}
      shortcutKey={START_TRIAL_SHORTCUT_KEY}
    />
  );
};
