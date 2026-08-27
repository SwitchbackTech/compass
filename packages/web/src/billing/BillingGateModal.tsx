import {
  type FC,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { track } from "@web/auth/posthog/track";
import { billingPreviewActions } from "@web/billing/billing-preview.store";
import { useBillingRedirect } from "@web/billing/useBillingRedirect";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { PixelPirateScouting } from "@web/components/WelcomeModal/PixelPirateScouting";
import { useAppLockReason } from "@web/shortcuts/app-lock";
import { keyboardKey } from "@web/shortcuts/is-bare-letter-key";

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

  // Welcome-style letter bindings: unmodified keys, preventDefault, then run.
  const handleShortcutKey = (event: KeyboardEvent) => {
    if (isRedirecting) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const actions: Record<string, () => void> = {
      s: () => void redirectTo("checkout"),
      [secondary.key.toLowerCase()]: secondary.onClick,
    };
    const action = actions[keyboardKey(event).toLowerCase()];
    if (!action) return;
    event.preventDefault();
    action();
  };

  return (
    <OverlayPanel
      align="center"
      ariaLabel={title}
      initialFocusRef={primaryButtonRef}
      panelClassName={PANEL_CLASSNAME}
      widthClassName="w-120"
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: keydown here is a modal-scoped shortcut layer, not an interactive element in its own right */}
      <div
        className="flex w-full flex-col items-center gap-4"
        onKeyDown={handleShortcutKey}
      >
        <PixelPirateScouting className="h-14 w-14" />
        <h1 className="font-medium text-xl">{title}</h1>
        <p className="text-sm text-text-muted">{body}</p>
        <div className="mt-2 flex w-full flex-col gap-2">
          <button
            ref={primaryButtonRef}
            className="c-button c-button-primary c-button-elevated inline-flex items-center justify-center rounded-full px-6 py-2"
            disabled={isRedirecting}
            onClick={() => void redirectTo("checkout")}
            type="button"
          >
            {isAwaitingCheckout ? "Start trial" : "Subscribe"}
            <ShortcutHint className="ml-2">S</ShortcutHint>
          </button>
          <button
            className={SECONDARY_BUTTON_CLASSNAME}
            disabled={isRedirecting}
            onClick={secondary.onClick}
            type="button"
          >
            {secondary.label}
            <ShortcutHint className="ml-2">{secondary.key}</ShortcutHint>
          </button>
        </div>
      </div>
    </OverlayPanel>
  );
};
