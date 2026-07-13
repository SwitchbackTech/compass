import {
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useState,
} from "react";
import { subscribeToReleaseNotes } from "@web/auth/compass/user/util/subscribe.util";
import { releaseNotesPromptActions } from "@web/auth/state/release-notes-prompt.store";
import { SUBSCRIBE_TO_UPDATES_TOAST_ID } from "@web/common/constants/toast.constants";
import { Z_INDEX_MODAL } from "@web/common/constants/web.constants";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { PixelPirate } from "@web/components/WelcomeModal/PixelPirate";

type PromptStatus = "asking" | "confirmed" | "declined";

// How long the confirmation / reassurance message lingers before the panel
// fades away into the app.
const MESSAGE_LINGER_MS = 1600;
// Matches the WelcomeModal fade/scale duration (duration-400).
const EXIT_MS = 400;

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/**
 * Shown once, right after a new user signs up (email/password or Google),
 * offering to subscribe to monthly release-note emails. RootShell mounts this
 * only while the store flag is open, so each open is a fresh mount (status
 * starts at "asking", no reset needed).
 *
 * Mirrors WelcomeModal's panel styling and fade/scale dismiss animation so the
 * first-run experience feels of a piece.
 */
export function ReleaseNotesPrompt() {
  const [status, setStatus] = useState<PromptStatus>("asking");
  const [closing, setClosing] = useState(false);

  // Focus the backdrop on mount so Escape works without a click first. A
  // callback ref beats useEffect here (fires exactly on attach, no deps).
  const focusOnMount = useCallback((node: HTMLDivElement | null) => {
    node?.focus();
  }, []);

  // Fade the backdrop and gently scale the panel before clearing the store, so
  // the reveal of the planner underneath feels smooth rather than abrupt.
  const dismiss = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(
      () => releaseNotesPromptActions.close(),
      prefersReducedMotion() ? 0 : EXIT_MS,
    );
  };

  // Show a closing message for a beat, then fade out.
  const lingerThenDismiss = () => {
    window.setTimeout(dismiss, MESSAGE_LINGER_MS);
  };

  const handleYes = async () => {
    if (status !== "asking") return;
    try {
      await subscribeToReleaseNotes();
    } catch {
      showErrorToast("Couldn't subscribe to updates. Please try again.", {
        toastId: SUBSCRIBE_TO_UPDATES_TOAST_ID,
      });
      dismiss();
      return;
    }
    setStatus("confirmed");
    lingerThenDismiss();
  };

  const handleNo = () => {
    if (status !== "asking") return;
    setStatus("declined");
    lingerThenDismiss();
  };

  // Escape / backdrop click bails straight out without subscribing.
  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      dismiss();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      dismiss();
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: The backdrop catches outside clicks and Escape to dismiss the prompt.
    <div
      className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-bg-primary/85 py-8 backdrop-blur-sm transition-opacity duration-400 ease-out data-closing:opacity-0 motion-reduce:transition-none"
      data-closing={closing || undefined}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      ref={focusOnMount}
      role="presentation"
      style={{ zIndex: Z_INDEX_MODAL }}
      tabIndex={-1}
    >
      <div
        role="dialog"
        aria-modal
        aria-label="Stay in the loop"
        data-closing={closing || undefined}
        className="flex w-112 max-w-[90vw] flex-col gap-6 rounded-xl bg-panel-bg p-8 text-center shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] transition-transform duration-400 ease-out data-closing:scale-105 motion-reduce:transition-none"
      >
        <PixelPirate className="mx-auto h-14 w-14 shrink-0" />

        {status === "asking" && (
          <>
            <div className="flex flex-col gap-2">
              <h2 className="font-bold text-2xl text-text-lighter leading-snug">
                Want monthly release notes?
              </h2>
              <p className="text-text-light">
                Once a month we&apos;ll email you what&apos;s new in Compass —
                the useful stuff, none of the noise. Unsubscribe anytime with
                one click from any email.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleYes}
                className="c-button c-button-primary c-button-elevated rounded-full px-8"
              >
                Yes, Keep Me Updated
              </button>
              <button
                type="button"
                onClick={handleNo}
                className="c-focus-ring rounded-full px-8 py-2 text-sm text-text-light transition-colors hover:text-text-lighter"
              >
                Nah, I don&apos;t want updates
              </button>
            </div>
          </>
        )}

        {status === "confirmed" && (
          <div className="flex flex-col gap-2">
            <h2 className="font-bold text-2xl text-text-lighter leading-snug">
              You&apos;re in! 🎉
            </h2>
            <p className="text-text-light">Monthly notes headed your way.</p>
          </div>
        )}

        {status === "declined" && (
          <div className="flex flex-col gap-2">
            <h2 className="font-bold text-2xl text-text-lighter leading-snug">
              No problem.
            </h2>
            <p className="text-text-light">
              You can sign up using the cmd palette if you change your mind.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
