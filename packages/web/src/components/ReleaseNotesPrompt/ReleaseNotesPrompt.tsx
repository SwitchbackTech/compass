import {
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { subscribeToReleaseNotes } from "@web/auth/compass/user/util/subscribe.util";
import {
  releaseNotesPromptActions,
  selectReleaseNotesPromptOpen,
  useReleaseNotesPromptStore,
} from "@web/auth/state/release-notes-prompt.store";
import { Z_INDEX_MODAL } from "@web/common/constants/web.constants";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { PixelPirate } from "@web/components/WelcomeModal/PixelPirate";

type PromptState = "asking" | "confirmed" | "declined";

export function ReleaseNotesPrompt() {
  const isOpen = useReleaseNotesPromptStore(selectReleaseNotesPromptOpen);
  const [state, setState] = useState<PromptState>("asking");
  const [closing, setClosing] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      setState("asking");
      setClosing(false);
      backdropRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  if (!isOpen) return null;

  const dismiss = () => {
    if (closing) return;
    setClosing(true);
    const reducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    timerRef.current = window.setTimeout(
      () => releaseNotesPromptActions.close(),
      reducedMotion ? 0 : 400,
    );
  };

  const decline = () => {
    if (state !== "asking") return;
    setState("declined");
    timerRef.current = window.setTimeout(dismiss, 1300);
  };

  const subscribe = async () => {
    if (state !== "asking") return;
    try {
      await subscribeToReleaseNotes();
      setState("confirmed");
      timerRef.current = window.setTimeout(dismiss, 1300);
    } catch {
      showErrorToast("Couldn't subscribe to updates. Please try again.");
      dismiss();
    }
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) decline();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") decline();
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: The backdrop catches outside clicks and Escape to dismiss the modal.
    <div
      className="fixed inset-0 flex items-center justify-center bg-bg-primary/85 p-8 backdrop-blur-sm transition-opacity duration-400 ease-out data-closing:opacity-0 motion-reduce:transition-none"
      data-closing={closing || undefined}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      ref={backdropRef}
      role="presentation"
      style={{ zIndex: Z_INDEX_MODAL }}
      tabIndex={-1}
    >
      <div
        role="dialog"
        aria-modal
        aria-label="Release notes subscription"
        data-closing={closing || undefined}
        className="flex w-120 max-w-[90vw] flex-col gap-6 rounded-xl bg-panel-bg p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] transition-transform duration-400 ease-out data-closing:scale-105 motion-reduce:transition-none"
      >
        <PixelPirate className="h-14 w-14" />
        {state === "asking" ? (
          <>
            <div className="flex flex-col gap-2">
              <h2 className="font-bold text-2xl text-text-lighter leading-snug">
                Want the latest Compass news?
              </h2>
              <p className="text-text-light">
                Get monthly release notes with new features, improvements, and
                helpful tips. Unsubscribe anytime from the email footer.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={decline}
                className="c-button rounded-full px-5"
              >
                Nah, I don&apos;t want updates
              </button>
              <button
                type="button"
                onClick={() => void subscribe()}
                className="c-button c-button-primary c-button-elevated rounded-full px-5"
              >
                Yes, Keep Me Updated
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <h2 className="font-bold text-2xl text-text-lighter leading-snug">
              {state === "confirmed" ? "You're in!" : "No problem."}
            </h2>
            <p className="text-text-light">
              {state === "confirmed"
                ? "Monthly notes headed your way."
                : "No problem, you can signup using the cmd palette if you change your mind."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
