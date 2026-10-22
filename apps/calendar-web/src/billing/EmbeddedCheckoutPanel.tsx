import { useQueryClient } from "@tanstack/react-query";
import { type FC, Suspense, useCallback, useRef } from "react";
import { BillingApi } from "@web/api/billing.api";
import { fetchEmbeddedCheckoutSecret } from "@web/billing/checkout-client-secret";
import { completeCheckoutSession } from "@web/billing/complete-checkout-session";
import { getEmbeddedCheckoutComponent } from "@web/billing/embedded-checkout/embedded-checkout.seam";
import { focusOnPointerEnter } from "@web/common/utils/focus-on-pointer-enter";
import { AuthButton } from "@web/components/AuthModal/components/AuthButton";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

export const EMBEDDED_CHECKOUT_PANEL_CLASSNAME =
  "max-w-full gap-4 border border-border bg-surface text-center text-text shadow-xl";
export const EMBEDDED_CHECKOUT_SECONDARY_BUTTON_CLASSNAME =
  "c-button c-button-secondary inline-flex items-center justify-center rounded-full px-6 py-2";
export const SIGNUP_TRIAL_CHECKOUT_MOUNT_CLASSNAME =
  "signup-trial-checkout-mount w-full";

const fetchCheckoutClientSecret = fetchEmbeddedCheckoutSecret(
  BillingApi.createCheckoutSession,
);

type CheckoutPrimaryAction = {
  label: string;
  shortcutLabel: string;
};

type EmbeddedCheckoutPanelProps = {
  publishableKey: string;
  onBack: () => void;
  onCheckoutComplete?: () => void;
  /** When set, shows a keycap beside Back and should match Escape handling. */
  backShortcutLabel?: string;
  backVariant?: "button" | "link";
  primaryAction?: CheckoutPrimaryAction;
};

function findEmbeddedCheckoutSubmit(
  mount: HTMLElement | null,
): HTMLButtonElement | null {
  if (!mount) return null;
  return (
    mount.querySelector<HTMLButtonElement>(
      "button[data-signup-trial-checkout-submit]",
    ) ?? mount.querySelector<HTMLButtonElement>("button:not([disabled])")
  );
}

/**
 * Checkout plus Back. The billing gate and CheckoutOverlay both host this
 * same panel; only the surrounding OverlayPanel differs.
 */
export const EmbeddedCheckoutPanel: FC<EmbeddedCheckoutPanelProps> = ({
  publishableKey,
  onBack,
  onCheckoutComplete,
  backShortcutLabel,
  backVariant = "button",
  primaryAction,
}) => {
  const queryClient = useQueryClient();
  const EmbeddedCheckout = getEmbeddedCheckoutComponent();
  const checkoutMountRef = useRef<HTMLDivElement>(null);
  const onComplete = useCallback(() => {
    completeCheckoutSession(queryClient);
    onCheckoutComplete?.();
  }, [onCheckoutComplete, queryClient]);

  const runPrimaryAction = useCallback(() => {
    findEmbeddedCheckoutSubmit(checkoutMountRef.current)?.click();
  }, []);

  useAppShortcut("Enter", runPrimaryAction, {
    enabled: Boolean(primaryAction),
    ignoreInputs: true,
    ignoreAppLock: true,
  });

  return (
    <div className="flex w-full flex-col items-stretch gap-4">
      <div
        ref={checkoutMountRef}
        className={
          primaryAction ? SIGNUP_TRIAL_CHECKOUT_MOUNT_CLASSNAME : "w-full"
        }
      >
        <Suspense
          fallback={
            <p className="text-sm text-text-muted">Loading checkout...</p>
          }
        >
          <EmbeddedCheckout
            className="w-full"
            fetchClientSecret={fetchCheckoutClientSecret}
            onComplete={onComplete}
            publishableKey={publishableKey}
          />
        </Suspense>
      </div>
      {primaryAction ? (
        <button
          className="c-button c-button-primary c-button-elevated inline-flex w-full items-center justify-center rounded-full px-6 py-2"
          onClick={runPrimaryAction}
          onPointerEnter={focusOnPointerEnter}
          type="button"
        >
          {primaryAction.label}
          <ShortcutHint className="ml-2">
            {primaryAction.shortcutLabel}
          </ShortcutHint>
        </button>
      ) : null}
      {backVariant === "link" ? (
        <AuthButton
          className="inline-flex items-center gap-2 self-center"
          onClick={onBack}
          type="button"
          variant="link"
        >
          Back
          {backShortcutLabel ? (
            <ShortcutHint>{backShortcutLabel}</ShortcutHint>
          ) : null}
        </AuthButton>
      ) : (
        <button
          className={`${EMBEDDED_CHECKOUT_SECONDARY_BUTTON_CLASSNAME} inline-flex items-center self-center`}
          onClick={onBack}
          onPointerEnter={focusOnPointerEnter}
          type="button"
        >
          Back
          {backShortcutLabel ? (
            <ShortcutHint className="ml-2">{backShortcutLabel}</ShortcutHint>
          ) : null}
        </button>
      )}
    </div>
  );
};
