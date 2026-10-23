import { type FC, useEffect } from "react";
import { checkoutPanelActions } from "@web/billing/checkout-panel.store";
import { TrialStartAsk } from "@web/billing/TrialStartAsk";

type StartTrialStepProps = {
  onDismiss: () => void;
};

/** Post-signup trial step inside AuthModal. */
export const StartTrialStep: FC<StartTrialStepProps> = ({ onDismiss }) => {
  useEffect(
    () => () => {
      checkoutPanelActions.close();
    },
    [],
  );

  return (
    <TrialStartAsk
      checkoutSource={{ kind: "signup_trial_step" }}
      onCheckoutComplete={onDismiss}
      trackSignupView
    />
  );
};
