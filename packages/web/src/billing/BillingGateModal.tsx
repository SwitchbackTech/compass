import { type FC, useEffect, useRef, useState } from "react";
import { BILLING_PLAN } from "@core/constants/billing.constants";
import { BillingApi } from "@web/api/billing.api";
import { useLogout } from "@web/auth/compass/hooks/useLogout";
import { track } from "@web/auth/posthog/track";
import { Z_INDEX_MODAL } from "@web/common/constants/web.constants";
import { runExportMyData } from "@web/common/storage/offline-data/export-user-data.util";
import { PixelPirateScouting } from "@web/components/WelcomeModal/PixelPirateScouting";
import { useAppLockReason } from "@web/shortcuts/app-lock";

type BillingGateModalProps = {
  status: string;
};

/**
 * Full app-lock overlay for signed-in users who cannot write (awaiting
 * checkout, expired, canceled). Intentionally not dismissible.
 */
export const BillingGateModal: FC<BillingGateModalProps> = ({ status }) => {
  useAppLockReason("billingGate", true);
  const logout = useLogout();
  const panelRef = useRef<HTMLDivElement>(null);
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
    panelRef.current?.focus();
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

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      style={{ zIndex: Z_INDEX_MODAL }}
    >
      <div
        ref={panelRef}
        aria-label={title}
        aria-modal="true"
        className="flex w-120 max-w-full flex-col items-center gap-4 rounded-xl border border-border bg-surface p-8 text-center text-text shadow-xl"
        role="dialog"
        tabIndex={-1}
      >
        <PixelPirateScouting className="h-14 w-14" />
        <h1 className="font-medium text-xl">{title}</h1>
        <p className="text-sm text-text-muted">{body}</p>
        <div className="mt-2 flex w-full flex-col gap-2">
          <button
            className="c-button c-button-primary c-button-elevated rounded-full px-6 py-2"
            disabled={isRedirecting}
            onClick={() => void redirectTo("checkout")}
            type="button"
          >
            {isAwaitingCheckout ? "Start trial" : "Subscribe"}
          </button>
          {isAwaitingCheckout ? null : (
            <button
              className="c-button c-button-secondary rounded-full px-6 py-2"
              disabled={isRedirecting}
              onClick={() => void redirectTo("portal")}
              type="button"
            >
              Manage billing
            </button>
          )}
        </div>
        <button
          className="c-focus-ring text-text-muted text-xs underline-offset-4 hover:text-text hover:underline"
          disabled={isExporting}
          onClick={() => void handleExport()}
          type="button"
        >
          {isExporting ? "Exporting…" : "Export my data"}
        </button>
        <button
          className="c-focus-ring text-text-muted text-xs underline-offset-4 hover:text-text hover:underline"
          onClick={() => {
            track("billing_gate_cta_clicked", { cta: "logout" });
            void logout();
          }}
          type="button"
        >
          Log out
        </button>
      </div>
    </div>
  );
};
