import { type FC, useEffect, useRef, useState } from "react";
import { track } from "@web/auth/posthog/track";
import { Z_INDEX_MODAL } from "@web/common/constants/web.constants";
import { runExportMyData } from "@web/common/storage/offline-data/export-user-data.util";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import { PixelPirateScouting } from "@web/components/WelcomeModal/PixelPirateScouting";
import { useAppLockReason } from "@web/shortcuts/app-lock";

/**
 * Full app-lock overlay shown once the anonymous browser trial has expired.
 * Unlike every other overlay in onboarding, this one is intentionally NOT
 * dismissible on Escape/backdrop — see 06-trial-spec.md. It still must be
 * fully keyboard-operable: focus lands here on mount, all actions are real
 * buttons, nothing depends on a mouse.
 */
export const TrialGateModal: FC = () => {
  useAppLockReason("trialGate", true);
  const { openModal } = useAuthModal();
  const panelRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    panelRef.current?.focus();
    if (!shownRef.current) {
      shownRef.current = true;
      track("trial_expired");
      track("trial_gate_shown");
    }
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    track("trial_gate_cta_clicked", { cta: "export" });
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
        aria-label="Your free trial has ended"
        aria-modal="true"
        className="flex w-120 max-w-full flex-col items-center gap-4 rounded-xl border border-border bg-surface p-8 text-center text-text shadow-xl"
        role="dialog"
        tabIndex={-1}
      >
        <PixelPirateScouting className="h-14 w-14" />
        <h1 className="font-medium text-xl">Your free trial has ended</h1>
        <p className="text-sm text-text-muted">
          Sign up to keep using Compass and pick up right where you left off.
        </p>
        <div className="mt-2 flex w-full flex-col gap-2">
          <button
            className="c-button c-button-primary c-button-elevated rounded-full px-6 py-2"
            onClick={() => {
              track("trial_gate_cta_clicked", { cta: "signup" });
              openModal("signUp");
            }}
            type="button"
          >
            Sign up to continue
          </button>
          <button
            className="c-button c-button-secondary rounded-full px-6 py-2"
            onClick={() => {
              track("trial_gate_cta_clicked", { cta: "login" });
              openModal("login");
            }}
            type="button"
          >
            Log in
          </button>
        </div>
        <button
          className="c-focus-ring text-text-muted text-xs underline-offset-4 hover:text-text hover:underline"
          disabled={isExporting}
          onClick={() => void handleExport()}
          type="button"
        >
          {isExporting ? "Exporting…" : "Export my data"}
        </button>
      </div>
    </div>
  );
};
