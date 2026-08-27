import { type FC, useEffect, useRef, useState } from "react";
import { track } from "@web/auth/posthog/track";
import {
  GATE_PANEL_CLASSNAME,
  handleOverlayLetterShortcut,
} from "@web/billing/gate-overlay";
import { runExportMyData } from "@web/common/storage/offline-data/export-user-data.util";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { PixelPirateScouting } from "@web/components/WelcomeModal/PixelPirateScouting";
import { useAppLockReason } from "@web/shortcuts/app-lock";

/**
 * Full app-lock overlay shown once the anonymous browser trial has expired.
 * Unlike every other overlay in onboarding, this one is intentionally NOT
 * dismissible on Escape/backdrop — see 06-trial-spec.md. It still must be
 * fully keyboard-operable: focus lands on the primary CTA, letter shortcuts
 * match Welcome (U/I/E), and OverlayPanel traps Tab.
 */
export const TrialGateModal: FC = () => {
  useAppLockReason("trialGate", true);
  const { openModal } = useAuthModal();
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!shownRef.current) {
      shownRef.current = true;
      track("trial_expired");
      track("trial_gate_shown");
    }
  }, []);

  const handleSignUp = () => {
    track("trial_gate_cta_clicked", { cta: "signup" });
    openModal("signUp");
  };

  const handleLogIn = () => {
    track("trial_gate_cta_clicked", { cta: "login" });
    openModal("login");
  };

  const handleExport = async () => {
    setIsExporting(true);
    track("trial_gate_cta_clicked", { cta: "export" });
    try {
      await runExportMyData();
    } finally {
      setIsExporting(false);
    }
  };

  const handleShortcutKey = (e: React.KeyboardEvent) => {
    handleOverlayLetterShortcut(e, {
      u: handleSignUp,
      i: handleLogIn,
      e: () => {
        if (!isExporting) void handleExport();
      },
    });
  };

  return (
    <OverlayPanel
      align="center"
      ariaLabel="Your free trial has ended"
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
        <h1 className="font-medium text-xl">Your free trial has ended</h1>
        <p className="text-sm text-text-muted">
          Sign up to keep using Compass and pick up right where you left off.
        </p>
        <div className="mt-2 flex w-full flex-col gap-2">
          <button
            ref={primaryButtonRef}
            className="c-button c-button-primary c-button-elevated inline-flex items-center justify-center rounded-full px-6 py-2"
            onClick={handleSignUp}
            type="button"
          >
            Sign up to continue
            <ShortcutHint className="ml-2">U</ShortcutHint>
          </button>
          <button
            className="c-button c-button-secondary inline-flex items-center justify-center rounded-full px-6 py-2"
            onClick={handleLogIn}
            type="button"
          >
            Log in
            <ShortcutHint className="ml-2">I</ShortcutHint>
          </button>
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
      </div>
    </OverlayPanel>
  );
};
