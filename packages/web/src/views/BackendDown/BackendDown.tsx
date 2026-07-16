import { useEffect, useState } from "react";
import { AppConfigApi } from "@web/api/app-config.api";
import { PixelPirate } from "@web/components/WelcomeModal/PixelPirate";

// Long enough to stay polite while the servers come back, short enough that a
// user who steps away finds the app already recovered.
const POLL_INTERVAL_MS = 20_000;

/**
 * A successful request flips the availability flag through `BaseApi`, which
 * unmounts this view. A failure keeps the flag set, so nothing to do here.
 */
const checkBackend = () => AppConfigApi.get().catch(() => undefined);

export const BackendDownView = () => {
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const timer = setInterval(checkBackend, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  const handleRetry = async () => {
    if (isChecking) return;
    setIsChecking(true);
    await checkBackend();
    setIsChecking(false);
  };

  return (
    <div className="c-not-found gap-4 px-6 text-center">
      <PixelPirate className="h-20 w-20" />

      <h1 className="font-[VT323,monospace] text-4xl">
        🏴‍☠️ Blimey! Our servers walked the plank
      </h1>

      <p className="max-w-xl text-text-light text-xl">
        Compass can't reach its own crew right now. It's us, not you.
      </p>
      <p className="max-w-xl text-text-light text-xl">
        Your calendar is safe below deck — nothing's lost.
      </p>
      <p className="max-w-xl text-text-light text-xl">
        We're bailing water as we speak. This page sails on by itself once we're
        back.
      </p>

      {/* aria-disabled + re-entry guard instead of `disabled`: disabling a
          focused button ejects keyboard focus to <body>, so every retry would
          cost a keyboard user a full re-Tab back to the button. */}
      <button
        type="button"
        onClick={handleRetry}
        aria-disabled={isChecking}
        className="mt-5 cursor-pointer rounded border-2 border-border-primary bg-fg-primary-dark px-4 py-2 font-semibold text-[16px] text-text-lighter transition-all duration-200 ease-in-out hover:brightness-120 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2 aria-disabled:cursor-wait aria-disabled:opacity-70"
      >
        {isChecking ? "Scanning the horizon..." : "Try again"}
      </button>
    </div>
  );
};
