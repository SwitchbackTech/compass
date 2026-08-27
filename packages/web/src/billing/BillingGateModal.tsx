import { type FC, useEffect, useRef, useState } from "react";
import { BILLING_PLAN } from "@core/constants/billing.constants";
import { BillingApi } from "@web/api/billing.api";
import {
  getApiErrorMessage,
  isSessionLevelError,
} from "@web/api/util/api.util";
import { useLogout } from "@web/auth/compass/hooks/useLogout";
import { track } from "@web/auth/posthog/track";
import { runExportMyData } from "@web/common/storage/offline-data/export-user-data.util";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { PixelPirateScouting } from "@web/components/WelcomeModal/PixelPirateScouting";
import { useAppLockReason } from "@web/shortcuts/app-lock";
import { keyboardKey } from "@web/shortcuts/is-bare-letter-key";

type BillingGateModalProps = {
  status: string;
};

const GATE_PANEL_CLASSNAME =
  "max-w-full gap-4 border border-border bg-surface text-center text-text shadow-xl";

/**
 * Full app-lock overlay for signed-in users who cannot write (awaiting
 * checkout, expired, canceled). Intentionally not dismissible.
 */
export const BillingGateModal: FC<BillingGateModalProps> = ({ status }) => {
  useAppLockReason("billingGate", true);
  const logout = useLogout();
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const shownRef = useRef(false);

  const isAwaitingCheckout = status === "awaiting_checkout";
  const title = isAwaitingCheckout
    ? "Start your 7-day trial"
    : "Subscribe to keep using Compass";
  const body = isAwaitingCheckout
    ? `Compass is ${BILLING_PLAN.PRICE_DISPLAY} after a ${BILLING_PLAN.TRIAL_LENGTH_DAYS}-day trial. A card is required to start.`
    : `Your trial has ended. Compass is ${BILLING_PLAN.PRICE_DISPLAY}.`;

  useEffect(() => {
    if (!shownRef.current) {
      shownRef.current = true;
      track("billing_gate_shown", { status });
    }
  }, [status]);

  const redirectTo = async (kind: "checkout" | "portal") => {
    if (isRedirecting) return;
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

  const handleExport = async () => {
    setIsExporting(true);
    track("billing_gate_cta_clicked", { cta: "export" });
    try {
      await runExportMyData();
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogout = () => {
    track("billing_gate_cta_clicked", { cta: "logout" });
    void logout();
  };

  const handleShortcutKey = (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = keyboardKey(e).toLowerCase();
    if (key === "s") {
      e.preventDefault();
      void redirectTo("checkout");
    } else if (key === "m" && !isAwaitingCheckout) {
      e.preventDefault();
      void redirectTo("portal");
    } else if (key === "e") {
      e.preventDefault();
      if (!isExporting) void handleExport();
    } else if (key === "l") {
      e.preventDefault();
      handleLogout();
    }
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
          {isAwaitingCheckout ? null : (
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
        <button
          className="c-focus-ring inline-flex items-center text-text-muted text-xs underline-offset-4 hover:text-text hover:underline"
          disabled={isExporting}
          onClick={() => void handleExport()}
          type="button"
        >
          {isExporting ? "Exporting…" : "Export my data"}
          {isExporting ? null : <ShortcutHint className="ml-2">E</ShortcutHint>}
        </button>
        <button
          className="c-focus-ring inline-flex items-center text-text-muted text-xs underline-offset-4 hover:text-text hover:underline"
          onClick={handleLogout}
          type="button"
        >
          Log out
          <ShortcutHint className="ml-2">L</ShortcutHint>
        </button>
      </div>
    </OverlayPanel>
  );
};
