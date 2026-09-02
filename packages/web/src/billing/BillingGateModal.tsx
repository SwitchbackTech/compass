import { type FC, useEffect, useRef } from "react";
import { track } from "@web/auth/posthog/track";
import { setBillingGateOwnsScreen } from "@web/billing/billing-gate-attention";
import { billingPreviewActions } from "@web/billing/billing-preview.store";
import { OVERLAY_LETTER_SHORTCUT } from "@web/billing/overlay-letter-shortcut";
import { useBillingRedirect } from "@web/billing/useBillingRedirect";
import { focusOnPointerEnter } from "@web/common/utils/focus-on-pointer-enter";
import { deferGoogleDelayedToastIfVisible } from "@web/common/utils/toast/google-delayed.toast";
import { deferGoogleReconnectToastIfVisible } from "@web/common/utils/toast/google-reconnect.toast";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { PixelPirateScouting } from "@web/components/WelcomeModal/PixelPirateScouting";
import { useAppLockReason } from "@web/shortcuts/app-lock";
import {
  POINTER_ACTION_ATTRIBUTE,
  POINTER_ACTIONS,
  pointerShortcutAttributes,
} from "@web/shortcuts/keyboard-only/pointer-action";
import { START_TRIAL_SHORTCUT_KEY } from "@web/shortcuts/notice-focus/useNoticeActionShortcut";
import { swallowNextKeyup } from "@web/shortcuts/swallow-next-keyup";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

const PANEL_CLASSNAME =
  "max-w-full gap-4 border border-border bg-surface text-center text-text shadow-xl";
const SECONDARY_BUTTON_CLASSNAME =
  "c-button c-button-secondary inline-flex items-center justify-center rounded-full px-6 py-2";

type BillingGateModalProps = {
  status: string;
};

/**
 * App-lock overlay for signed-in users who cannot write (awaiting checkout,
 * expired, canceled). Escape and the backdrop do nothing, but a user who has
 * not started a trial yet can step past it into a read-only look around the
 * real calendar; the first refused write brings it straight back.
 */
export const BillingGateModal: FC<BillingGateModalProps> = ({ status }) => {
  useAppLockReason("billingGate", true);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const secondaryButtonRef = useRef<HTMLButtonElement>(null);
  const { isRedirecting, redirectTo } = useBillingRedirect();
  const shownRef = useRef(false);

  const isAwaitingCheckout = status === "awaiting_checkout";
  const title = isAwaitingCheckout
    ? "Start your 7-day trial"
    : "Subscribe to keep using Compass";
  const body = isAwaitingCheckout
    ? "Try Compass for free for 7 days"
    : "Your trial has ended.";

  useEffect(() => {
    if (!shownRef.current) {
      shownRef.current = true;
      track("billing_gate_shown", { status });
    }
  }, [status]);

  useEffect(() => {
    setBillingGateOwnsScreen(true);
    deferGoogleReconnectToastIfVisible();
    deferGoogleDelayedToastIfVisible();
    return () => setBillingGateOwnsScreen(false);
  }, []);

  const lookAround = () => {
    track("billing_gate_cta_clicked", { cta: "preview" });
    billingPreviewActions.enter();
  };

  // Only a trial still on offer earns the look-around; once it is spent the
  // way forward is the billing portal.
  const secondary = isAwaitingCheckout
    ? { key: "L", label: "Look around first", onClick: lookAround }
    : {
        key: "M",
        label: "Manage billing",
        onClick: () => void redirectTo("portal"),
      };

  useAppShortcut(
    START_TRIAL_SHORTCUT_KEY,
    () => {
      if (isRedirecting) return;
      void redirectTo("checkout");
    },
    OVERLAY_LETTER_SHORTCUT,
  );

  useAppShortcut(
    "L",
    () => {
      if (isRedirecting) return;
      // Look-around unmounts this overlay and drops app-lock before keyup.
      // Life view is bound on that keyup — swallow it so L only means preview.
      swallowNextKeyup("l");
      lookAround();
    },
    { ...OVERLAY_LETTER_SHORTCUT, enabled: isAwaitingCheckout },
  );

  useAppShortcut(
    "M",
    () => {
      if (isRedirecting) return;
      secondaryButtonRef.current?.focus({ preventScroll: true });
      void redirectTo("portal");
    },
    { ...OVERLAY_LETTER_SHORTCUT, enabled: !isAwaitingCheckout },
  );

  return (
    <OverlayPanel
      align="center"
      ariaLabel={title}
      initialFocusRef={primaryButtonRef}
      panelClassName={PANEL_CLASSNAME}
      widthClassName="w-120"
    >
      <div className="flex w-full flex-col items-center gap-4">
        <PixelPirateScouting className="h-14 w-14" />
        <h1 className="font-medium text-xl">{title}</h1>
        <p className="text-sm text-text-muted">{body}</p>
        <div className="mt-2 flex w-full flex-col gap-2">
          <button
            ref={primaryButtonRef}
            className="c-button c-button-primary c-button-elevated inline-flex items-center justify-center rounded-full px-6 py-2"
            disabled={isRedirecting}
            onClick={() => void redirectTo("checkout")}
            onPointerEnter={focusOnPointerEnter}
            type="button"
            {...pointerShortcutAttributes(START_TRIAL_SHORTCUT_KEY)}
            {...(isAwaitingCheckout
              ? { [POINTER_ACTION_ATTRIBUTE]: POINTER_ACTIONS.startTrial }
              : {})}
          >
            {isRedirecting
              ? "Opening Stripe…"
              : isAwaitingCheckout
                ? "Start trial"
                : "Subscribe"}
            <ShortcutHint className="ml-2">
              {START_TRIAL_SHORTCUT_KEY}
            </ShortcutHint>
          </button>
          <button
            ref={secondaryButtonRef}
            className={SECONDARY_BUTTON_CLASSNAME}
            disabled={isRedirecting}
            onClick={secondary.onClick}
            onPointerEnter={focusOnPointerEnter}
            type="button"
            {...pointerShortcutAttributes(secondary.key)}
          >
            {isRedirecting && secondary.key === "M"
              ? "Opening Stripe…"
              : secondary.label}
            <ShortcutHint className="ml-2">{secondary.key}</ShortcutHint>
          </button>
        </div>
      </div>
    </OverlayPanel>
  );
};
