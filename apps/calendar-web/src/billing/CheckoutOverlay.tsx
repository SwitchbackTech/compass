import { type FC } from "react";
import { useStripePublishableKey } from "@web/billing/billing.query";
import {
  type CheckoutPanelSource,
  checkoutPanelActions,
  selectCheckoutPanelOpen,
  useCheckoutPanelStore,
} from "@web/billing/checkout-panel.store";
import {
  EMBEDDED_CHECKOUT_PANEL_CLASSNAME,
  EmbeddedCheckoutPanel,
} from "@web/billing/EmbeddedCheckoutPanel";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";

/**
 * Embedded Checkout when the full-screen gate is not on screen: shortcut
 * upgrade toast, and any other writable-session Subscribe now path.
 * The billing gate hosts its own overlay.
 */
const hostsCheckoutInline = (source: CheckoutPanelSource | null): boolean =>
  source?.kind === "signup_trial_step" || source?.kind === "settings_trial_ask";

export const CheckoutOverlay: FC = () => {
  const isOpen = useCheckoutPanelStore(selectCheckoutPanelOpen);
  const source = useCheckoutPanelStore((state) => state.source);
  const publishableKey = useStripePublishableKey();

  if (!isOpen || !publishableKey || hostsCheckoutInline(source)) return null;

  return (
    <OverlayPanel
      align="center"
      ariaLabel="Checkout"
      backdropClassName="overflow-y-auto"
      onDismiss={checkoutPanelActions.close}
      panelClassName={EMBEDDED_CHECKOUT_PANEL_CLASSNAME}
      widthClassName="w-[560px]"
    >
      <EmbeddedCheckoutPanel
        onBack={checkoutPanelActions.close}
        publishableKey={publishableKey}
      />
    </OverlayPanel>
  );
};
