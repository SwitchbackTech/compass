import {
  type FC,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { BillingApi } from "@web/api/billing.api";
import {
  getApiErrorMessage,
  isSessionLevelError,
} from "@web/api/util/api.util";
import { track } from "@web/auth/posthog/track";
import { billingPreviewActions } from "@web/billing/billing-preview.store";
import {
  GATE_PANEL_CLASSNAME,
  handleOverlayLetterShortcut,
} from "@web/billing/gate-overlay";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { PixelPirateScouting } from "@web/components/WelcomeModal/PixelPirateScouting";
import { useAppLockReason } from "@web/shortcuts/app-lock";

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
  const [isRedirecting, setIsRedirecting] = useState(false);
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

  const redirectTo = async (kind: "checkout" | "portal") => {
    setIsRedirecting(true);
    track("billing_gate_cta_clicked", { cta: kind });
    try {
      const { url } =
        kind === "checkout"
          ? await BillingApi.createCheckoutSession()
          : await BillingApi.createPortalSession();
      window.location.assign(url);
    } catch (error) {
      if (!isSessionLevelError(error)) {
        const fromApi = getApiErrorMessage(error);
        showErrorToast(
          fromApi && fromApi !== "Internal server error"
            ? fromApi
            : "Couldn't start checkout. Please try again.",
        );
      }
    } finally {
      setIsRedirecting(false);
    }
  };

  const handleLookAround = () => {
    track("billing_gate_cta_clicked", { cta: "preview" });
    billingPreviewActions.enter();
  };

  const handleShortcutKey = (e: KeyboardEvent) => {
    if (isRedirecting) return;
    const actions: Record<string, () => void> = {
      s: () => {
        void redirectTo("checkout");
      },
    };
    if (isAwaitingCheckout) {
      actions.l = handleLookAround;
    } else {
      actions.m = () => {
        void redirectTo("portal");
      };
    }
    handleOverlayLetterShortcut(e, actions);
  };

  return (
    <OverlayPanel
      align="center"
      ariaLabel={title}
      initialFocusRef={primaryButtonRef}
      panelClassName={GATE_PANEL_CLASSNAME}
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
          {isAwaitingCheckout ? (
            <button
              className="c-button c-button-secondary inline-flex items-center justify-center rounded-full px-6 py-2"
              disabled={isRedirecting}
              onClick={handleLookAround}
              type="button"
            >
              Look around first
              <ShortcutHint className="ml-2">L</ShortcutHint>
            </button>
          ) : (
            <button
              className="c-button c-button-secondary inline-flex items-center justify-center rounded-full px-6 py-2"
              disabled={isRedirecting}
              onClick={() => void redirectTo("portal")}
              type="button"
            >
              Manage billing
              <ShortcutHint className="ml-2">M</ShortcutHint>
            </button>
          )}
        </div>
      </div>
    </OverlayPanel>
  );
};
