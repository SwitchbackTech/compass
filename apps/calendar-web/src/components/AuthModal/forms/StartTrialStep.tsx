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
import {
  consumeTrialStepTrigger,
  TRIAL_STEP_WRITE_LEAD,
} from "@web/billing/trial-step-request";

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
 * Post-signup trial step: embedded Checkout inside AuthModal. Title, terms,
 * and Back live in AuthModal/OverlayPanel; only the Stripe form scrolls here.
 */
export const StartTrialStep: FC<StartTrialStepProps> = ({ onDismiss }) => {
  const signupMethod = readSignupTrialMethod();
  const publishableKey = useStripePublishableKey();
  const subscriptionQuery = useBillingSubscriptionQuery(true);
  const planPriceLine = formatSignupTrialPlanPrice(
    subscriptionQuery.data?.price,
  );
  const viewedRef = useRef(false);
  const writeLeadRef = useRef(consumeTrialStepTrigger() === "write");

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
    <div className="flex min-h-0 w-full flex-1 flex-col gap-3">
      {writeLeadRef.current ? (
        <p className="shrink-0 text-center text-sm text-text">
          {TRIAL_STEP_WRITE_LEAD}
        </p>
      ) : null}
      {planPriceLine ? (
        <p className="shrink-0 text-left text-sm text-text">{planPriceLine}</p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {publishableKey ? (
          <EmbeddedCheckoutPanel
            onCheckoutComplete={onDismiss}
            publishableKey={publishableKey}
          />
        ) : (
          <p className="text-sm text-text-muted">Loading checkout...</p>
        )}
      </div>
    </div>
  );
};
