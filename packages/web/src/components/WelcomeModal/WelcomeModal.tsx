import {
  GithubLogoIcon,
  LinkedinLogoIcon,
  XLogoIcon,
} from "@phosphor-icons/react";
import {
  type KeyboardEvent,
  type MouseEvent,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { SessionContext } from "@web/auth/compass/session/session.context";
import { Z_INDEX_MODAL } from "@web/common/constants/web.constants";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import { maybeShowCmdPaletteHint } from "./cmd-palette-hint.util";
import { WelcomeGuideBody } from "./WelcomeGuideBody";
import { PixelPirate } from "./PixelPirate";
import { hasSeenWelcome, markWelcomeSeen } from "./welcome.modal.util";

export function WelcomeModal() {
  const { authenticated } = useContext(SessionContext);
  const { openModal, isOpen: isAuthModalOpen } = useAuthModal();
  const [isOpen, setIsOpen] = useState(
    () => !authenticated && !hasSeenWelcome(),
  );
  const [closing, setClosing] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  // The auth modal's openness lives in the URL (?auth=), so the welcome
  // screen simply hides while it is open and reappears when the browser
  // back button (or Escape) removes the param again.
  const visible = isOpen && !isAuthModalOpen && !authenticated;

  useEffect(() => {
    if (visible) {
      backdropRef.current?.focus();
    }
  }, [visible]);

  if (!visible) return null;

  // Fade the backdrop and gently scale the panel before unmounting, so the
  // first reveal of the sidebar underneath feels smooth rather than abrupt.
  const dismiss = () => {
    if (closing) return;
    markWelcomeSeen();
    maybeShowCmdPaletteHint();
    setClosing(true);
    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    window.setTimeout(() => setIsOpen(false), reduceMotion ? 0 : 400);
  };

  const handleLogIn = () => {
    markWelcomeSeen();
    openModal("login");
  };

  const handleSignUp = () => {
    markWelcomeSeen();
    openModal("signUp");
  };

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
    // biome-ignore lint/a11y/noStaticElementInteractions: The backdrop catches outside clicks and Escape to dismiss the welcome modal.
    <div
      className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-background/85 py-8 backdrop-blur-sm transition-opacity duration-400 ease-out data-closing:opacity-0 motion-reduce:transition-none"
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
        aria-label="Welcome to Compass Calendar"
        data-closing={closing || undefined}
        className="flex w-120 max-w-[90vw] flex-col gap-6 rounded-xl bg-surface-panel p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] transition-transform duration-400 ease-out data-closing:scale-105 motion-reduce:transition-none"
      >
        {/* Top row: pirate top-left, auth pills top-right */}
        <div className="flex items-center justify-between">
          <div className="group relative flex items-center">
            <PixelPirate className="h-14 w-14 shrink-0" />
            <div className="pointer-events-none absolute left-full ml-1 flex -translate-x-1 items-center opacity-0 transition-all duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100">
              <span
                aria-hidden
                className="h-0 w-0 border-y-4 border-y-transparent border-r-4 border-r-surface-overlay"
              />
              <span className="whitespace-nowrap rounded-lg bg-surface-overlay px-3 py-1 font-[VT323,monospace] text-base text-text">
                No signup required
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleSignUp}
              className="rounded-3xl bg-accent px-4 py-1.5 text-on-accent text-xs transition-all hover:brightness-110"
            >
              Sign up
            </button>
            <button
              type="button"
              onClick={handleLogIn}
              className="rounded-3xl bg-[#c2c6cc] px-4 py-1.5 text-[#1f1f1f] text-xs transition-all hover:bg-[#d1d5da]"
            >
              Log in
            </button>
          </div>
        </div>

        <WelcomeGuideBody />

        {/* CTA */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={dismiss}
            className="c-button c-button-primary c-button-elevated rounded-full px-10"
          >
            Start Now
          </button>
        </div>

        {/* Footer: social + legal */}
        <div className="flex items-center justify-between border-border border-t pt-4">
          <div className="flex items-center gap-3">
            <a
              href="https://x.com/CompassCalendar"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X (Twitter)"
              className="c-focus-ring text-text-muted transition-colors hover:text-text"
            >
              <XLogoIcon size={18} weight="bold" />
            </a>
            <a
              href="https://www.linkedin.com/company/compass-calendar"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="c-focus-ring text-text-muted transition-colors hover:text-text"
            >
              <LinkedinLogoIcon size={18} weight="bold" />
            </a>
            <a
              href="https://www.github.com/SwitchbackTech/compass-calendar"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="c-focus-ring text-text-muted transition-colors hover:text-text"
            >
              <GithubLogoIcon size={18} weight="bold" />
            </a>
          </div>
          <div className="flex items-center gap-4 text-text-muted text-xs">
            <a
              href="https://compasscalendar.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="c-focus-ring underline-offset-4 hover:text-text hover:underline"
            >
              Privacy
            </a>
            <a
              href="https://compasscalendar.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="c-focus-ring underline-offset-4 hover:text-text hover:underline"
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
