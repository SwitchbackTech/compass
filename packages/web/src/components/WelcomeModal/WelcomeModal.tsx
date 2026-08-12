import {
  GithubLogoIcon,
  LinkedinLogoIcon,
  XLogoIcon,
} from "@phosphor-icons/react";
import { useContext, useEffect, useRef, useState } from "react";
import { SessionContext } from "@web/auth/compass/session/session.context";
import { track } from "@web/auth/posthog/track";
import { MODAL_DISMISS_MS } from "@web/common/constants/motion.constants";
import { SOCIAL_LINKS } from "@web/common/constants/social.constants";
import { useDismissTransition } from "@web/common/hooks/useDismissTransition";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { shortcutShowcaseActions } from "@web/components/ShortcutShowcase/showcase.store";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { PixelPirate } from "./PixelPirate";
import { WelcomeGuideBody } from "./WelcomeGuideBody";
import { hasSeenWelcome, markWelcomeSeen } from "./welcome.modal.util";

const SOCIAL_ICONS = {
  x: XLogoIcon,
  linkedin: LinkedinLogoIcon,
  github: GithubLogoIcon,
} as const;

export function WelcomeModal() {
  const { authenticated } = useContext(SessionContext);
  const { openModal, isOpen: isAuthModalOpen } = useAuthModal();
  const [isOpen, setIsOpen] = useState(
    () => !authenticated && !hasSeenWelcome(),
  );
  const { closing, beginDismiss } = useDismissTransition(MODAL_DISMISS_MS);
  // Suppress OverlayPanel's unmount restore when handing off to Auth — Auth
  // seats its own focus; restoring the underlay first causes a focus flash.
  const skipFocusRestoreRef = useRef(false);

  // The auth modal's openness lives in the URL (?auth=), so the welcome
  // screen simply hides while it is open and reappears when the browser
  // back button (or Escape) removes the param again.
  const visible = isOpen && !isAuthModalOpen && !authenticated;

  const shownRef = useRef(false);
  useEffect(() => {
    if (visible) {
      skipFocusRestoreRef.current = false;
      if (!shownRef.current) {
        shownRef.current = true;
        track("welcome_modal_shown");
      }
    }
  }, [visible]);

  if (!visible) return null;

  // Fade the backdrop and gently scale the panel before unmounting, so the
  // first reveal of the sidebar underneath feels smooth rather than abrupt.
  const dismiss = (cta: "start_now" | "dismissed" = "dismissed") => {
    if (closing) return;
    markWelcomeSeen();
    // Backdrop / Escape never traps the user in this modal, but it also
    // never dead-ends into a blank calendar: both paths start the showcase.
    shortcutShowcaseActions.start(cta === "start_now" ? "start_now" : "escape");
    track("welcome_modal_dismissed", { cta });
    beginDismiss(() => setIsOpen(false));
  };

  const handleShortcutKey = (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === "u") {
      e.preventDefault();
      handOffToAuth("sign_up");
    } else if (key === "i") {
      e.preventDefault();
      handOffToAuth("log_in");
    } else if (key === "s") {
      e.preventDefault();
      dismiss("start_now");
    }
  };

  const handOffToAuth = (cta: "log_in" | "sign_up") => {
    skipFocusRestoreRef.current = true;
    markWelcomeSeen();
    shortcutShowcaseActions.markSkippedWithoutStarting({
      pendingSignup: cta === "sign_up",
    });
    track("welcome_modal_dismissed", { cta });
    if (cta === "sign_up") {
      track("signup_started", { source: "welcome_modal" });
    }
    openModal(cta === "log_in" ? "login" : "signUp");
  };

  return (
    <OverlayPanel
      align="start"
      ariaLabel="Welcome to Compass Calendar"
      backdropClassName="overflow-y-auto py-8"
      closing={closing}
      onDismiss={dismiss}
      skipFocusRestoreRef={skipFocusRestoreRef}
      widthClassName="w-120"
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: keydown here is a modal-scoped shortcut layer, not an interactive element in its own right */}
      <div className="flex w-full flex-col gap-6" onKeyDown={handleShortcutKey}>
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
              onClick={() => handOffToAuth("sign_up")}
              className="inline-flex items-center rounded-3xl bg-accent px-4 py-1.5 text-on-accent text-xs transition-all hover:brightness-110"
            >
              Sign up
              <ShortcutHint className="ml-2">U</ShortcutHint>
            </button>
            <button
              type="button"
              onClick={() => handOffToAuth("log_in")}
              className="inline-flex items-center rounded-3xl bg-[#c2c6cc] px-4 py-1.5 text-[#1f1f1f] text-xs transition-all hover:bg-[#d1d5da]"
            >
              Log in
              <ShortcutHint className="ml-2">I</ShortcutHint>
            </button>
          </div>
        </div>

        <WelcomeGuideBody />

        {/* CTA */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => dismiss("start_now")}
            className="c-button c-button-primary c-button-elevated inline-flex items-center rounded-full px-10"
          >
            Start Now
            <ShortcutHint className="ml-2">S</ShortcutHint>
          </button>
        </div>

        {/* Footer: social + legal */}
        <div className="flex items-center justify-between border-border border-t pt-4">
          <div className="flex items-center gap-3">
            {SOCIAL_LINKS.map(({ id, label, href }) => {
              const SocialIcon = SOCIAL_ICONS[id];
              return (
                <a
                  key={id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="c-focus-ring text-text-muted transition-colors hover:text-text"
                >
                  <SocialIcon size={18} weight="bold" />
                </a>
              );
            })}
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
    </OverlayPanel>
  );
}
