import { type FC, useEffect, useRef } from "react";
import { type BillingSubscriptionResponse } from "@core/types/billing.types";
import { trackTrialStepViewed } from "@web/auth/posthog/signup-funnel";
import {
  useBillingSubscriptionQuery,
  useStripePublishableKey,
} from "@web/billing/billing.query";
import { formatBillingPriceLine } from "@web/billing/billing-display";
import { checkoutPanelActions } from "@web/billing/checkout-panel.store";
import { EmbeddedCheckoutPanel } from "@web/billing/EmbeddedCheckoutPanel";
import { readSignupTrialMethod } from "@web/billing/signup-trial.util";
import { signupTrialStepTermsLine } from "@web/components/WelcomeModal/welcome-account-choice.util";

type BillingPrice = NonNullable<BillingSubscriptionResponse["price"]>;

/** Same line as Settings > Billing, with no price to show before it loads. */
export function formatSignupTrialPlanPrice(
  price: BillingPrice | null | undefined,
): string | null {
  return price ? formatBillingPriceLine(price) : null;
}

type StartTrialStepProps = {
  onDismiss: () => void;
};

/**
 * Post-signup trial step: card terms and embedded Checkout inside AuthModal.
 */
export const StartTrialStep: FC<StartTrialStepProps> = ({ onDismiss }) => {
  const signupMethod = readSignupTrialMethod();
  const termsLine = signupTrialStepTermsLine();
  const publishableKey = useStripePublishableKey();
  const subscriptionQuery = useBillingSubscriptionQuery(true);
  const planPriceLine = formatSignupTrialPlanPrice(
    subscriptionQuery.data?.price,
  );
  const viewedRef = useRef(false);

  useEffect(() => {
    checkoutPanelActions.holdSource({ kind: "signup_trial_step" });
    return () => {
      checkoutPanelActions.close();
    };
  }, []);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackTrialStepViewed({ source: "signup_trial_step", method: signupMethod });
  }, [signupMethod]);

  return (
    <div className="flex w-full flex-col items-stretch gap-4 text-left">
      <p className="text-sm text-text-muted">{termsLine}</p>
      {planPriceLine ? (
        <p className="text-sm text-text">{planPriceLine}</p>
      ) : null}
      {publishableKey ? (
        <EmbeddedCheckoutPanel
          backShortcutLabel="Esc"
          backVariant="link"
          onBack={onDismiss}
          onCheckoutComplete={onDismiss}
          primaryAction={{ label: "Start free trial", shortcutLabel: "Enter" }}
          publishableKey={publishableKey}
        />
      ) : (
        <p className="text-sm text-text-muted">Loading checkout...</p>
      )}
    </div>
  );
};
