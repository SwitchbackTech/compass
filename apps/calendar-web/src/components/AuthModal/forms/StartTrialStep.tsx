import { type FC, useEffect, useRef } from "react";
import { BILLING_PLAN } from "@core/constants/billing.constants";
import { type BillingSubscriptionResponse } from "@core/types/billing.types";
import { trackTrialStepViewed } from "@web/auth/posthog/signup-funnel";
import {
  useAppConfigQuery,
  useBillingSubscriptionQuery,
  useStripePublishableKey,
} from "@web/billing/billing.query";
import { formatBillingPriceLine } from "@web/billing/billing-display";
import { checkoutPanelActions } from "@web/billing/checkout-panel.store";
import {
  EMBEDDED_CHECKOUT_PANEL_CLASSNAME,
  EmbeddedCheckoutPanel,
} from "@web/billing/EmbeddedCheckoutPanel";
import { readSignupTrialMethod } from "@web/billing/signup-trial.util";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { welcomeTrialCardTermsLine } from "@web/components/WelcomeModal/welcome-account-choice.util";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

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
  const configQuery = useAppConfigQuery();
  const trialLengthDays =
    configQuery.data?.billing.trialLengthDays ?? BILLING_PLAN.TRIAL_LENGTH_DAYS;
  const termsLine = welcomeTrialCardTermsLine(trialLengthDays);
  const publishableKey = useStripePublishableKey();
  const subscriptionQuery = useBillingSubscriptionQuery(true);
  const planPriceLine = formatSignupTrialPlanPrice(
    subscriptionQuery.data?.price,
  );
  const viewedRef = useRef(false);
  const checkoutRootRef = useRef<HTMLDivElement>(null);

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

  useAppShortcut(
    "Enter",
    () => {
      const root = checkoutRootRef.current;
      if (!root) return;
      const primary = root.querySelector<HTMLButtonElement>(
        "button:not([disabled])",
      );
      primary?.click();
    },
    { ignoreInputs: true, ignoreAppLock: true },
  );

  return (
    <div
      ref={checkoutRootRef}
      className={`flex w-full flex-col items-center gap-4 ${EMBEDDED_CHECKOUT_PANEL_CLASSNAME}`}
    >
      <p className="text-center text-sm text-text-muted">{termsLine}</p>
      {planPriceLine ? (
        <p className="text-sm text-text">{planPriceLine}</p>
      ) : null}
      {publishableKey ? (
        <>
          <p className="inline-flex items-center gap-2 text-text-muted text-xs">
            Submit card
            <ShortcutHint>Enter</ShortcutHint>
          </p>
          <EmbeddedCheckoutPanel
            backShortcutLabel="Esc"
            onBack={onDismiss}
            onCheckoutComplete={onDismiss}
            publishableKey={publishableKey}
          />
        </>
      ) : (
        <p className="text-sm text-text-muted">Loading checkout...</p>
      )}
    </div>
  );
};
