import { type FC, useEffect, useRef } from "react";
import { track } from "@web/auth/posthog/track";
import {
  checkoutCelebrationActions,
  selectIsCelebrating,
  useCheckoutCelebrationStore,
} from "@web/billing/checkout-celebration.store";
import { type AppAccess, useAppAccess } from "@web/billing/useAppAccess";
import { MODAL_DISMISS_MS } from "@web/common/constants/motion.constants";
import { useDismissTransition } from "@web/common/hooks/useDismissTransition";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { PixelPirate } from "@web/components/WelcomeModal/PixelPirate";

const PANEL_CLASSNAME =
  "max-w-full gap-4 border border-border bg-surface text-center text-text shadow-xl";

const TITLE = "You're aboard!";

/**
 * The status is read live rather than captured on mount: `useCheckoutReturn`
 * polls billing status for 15s after the return, so a user who lands before
 * the Stripe webhook does sees "Setting up" sharpen into the real plan
 * without the modal remounting.
 */
const getBody = (access: AppAccess): string => {
  if (access.kind !== "server") return "Setting up your subscription...";
  if (access.status === "trialing") {
    return "Your 7-day trial has started. Full access, nothing held back.";
  }
  if (access.status === "active") return "You're a Compass Premium member.";
  return "Setting up your subscription...";
};

/**
 * The moment the anonymous -> trial transition is finally acknowledged.
 * Raised by `useCheckoutReturn` on `?checkout=success`; `RootShell` suppresses
 * the billing gate while it is up, so the two never fight for the screen
 * during the webhook gap.
 */
export const CheckoutCelebrationModal: FC = () => {
  const isCelebrating = useCheckoutCelebrationStore(selectIsCelebrating);
  const access = useAppAccess();
  const { closing, beginDismiss } = useDismissTransition(MODAL_DISMISS_MS);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const shownRef = useRef(false);

  const status = access.kind === "server" ? access.status : "unknown";

  useEffect(() => {
    if (!isCelebrating || shownRef.current) return;
    shownRef.current = true;
    track("trial_celebration_shown", { status });
  }, [isCelebrating, status]);

  if (!isCelebrating) return null;

  const dismiss = () => {
    beginDismiss(checkoutCelebrationActions.dismiss);
  };

  return (
    <OverlayPanel
      align="center"
      ariaLabel={TITLE}
      closing={closing}
      initialFocusRef={primaryButtonRef}
      onDismiss={dismiss}
      panelClassName={PANEL_CLASSNAME}
      widthClassName="w-120"
    >
      <div className="flex w-full flex-col items-center gap-4">
        <PixelPirate className="c-pirate-cheer h-20 w-20" />
        <h1 className="font-medium text-xl">{TITLE}</h1>
        <p className="text-sm text-text-muted">{getBody(access)}</p>
        <button
          className="c-button c-button-primary c-button-elevated mt-2 inline-flex items-center justify-center rounded-full px-6 py-2"
          onClick={dismiss}
          ref={primaryButtonRef}
          type="button"
        >
          Start planning
          <ShortcutHint className="ml-2">Enter</ShortcutHint>
        </button>
      </div>
    </OverlayPanel>
  );
};
