import classNames from "classnames";
import { useContext, useEffect, useRef, useState } from "react";
import { SessionContext } from "@web/auth/compass/session/session.context";
import { useStartGoogleAuthorization } from "@web/auth/google/authorization/useStartGoogleAuthorization";
import { useIsGoogleAvailable } from "@web/auth/google/hooks/useIsGoogleAvailable/useIsGoogleAvailable";
import { track } from "@web/auth/posthog/track";
import { MODAL_DISMISS_MS } from "@web/common/constants/motion.constants";
import { useDismissTransition } from "@web/common/hooks/useDismissTransition";
import { GoogleButton } from "@web/components/AuthModal/components/GoogleButton";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { hasPlayDeepLink } from "@web/components/ShortcutShowcase/play-link";
import { shortcutShowcaseActions } from "@web/components/ShortcutShowcase/showcase.store";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { keyboardKey } from "@web/shortcuts/is-bare-letter-key";
import { pointerShortcutAttributes } from "@web/shortcuts/keyboard-only/pointer-action";
import { PixelPirate } from "./PixelPirate";
import {
  flashedShortcutClass,
  useFlashedWelcomeShortcut,
} from "./useFlashedWelcomeShortcut";
import { WelcomeGuideBody } from "./WelcomeGuideBody";
import { welcomeGuideActions } from "./welcome.guide.store";
import { hasSeenWelcome, markWelcomeSeen } from "./welcome.modal.util";

export function WelcomeModal() {
  const { authenticated } = useContext(SessionContext);
  const { openModal, isOpen: isAuthModalOpen } = useAuthModal();
  const isGoogleAvailable = useIsGoogleAvailable();
  const { loading: isGoogleAuthLoading, startGoogleAuthorization } =
    useStartGoogleAuthorization({ intent: "signIn" });
  // A ?play= deep link goes straight to the practice game. This initializer
  // runs before ShowcasePlayLink's consume effect can mark welcome seen, so
  // the param itself has to keep this modal closed.
  const [isOpen, setIsOpen] = useState(
    () => !authenticated && !hasSeenWelcome() && !hasPlayDeepLink(),
  );
  const { closing, beginDismiss, cancelDismiss } =
    useDismissTransition(MODAL_DISMISS_MS);
  // Suppress OverlayPanel's unmount restore when handing off to Auth — Auth
  // seats its own focus; restoring the underlay first causes a focus flash.
  const skipFocusRestoreRef = useRef(false);
  // Explore starts the practice after this dialog unmounts. A login/signup
  // handoff during the fade must cancel that so the takeover does not cover
  // the auth form.
  const startShowcaseAfterDismissRef = useRef(false);
  // openModal() only schedules a URL update. Hide immediately so Explore
  // cannot start the practice on top of a login that has not committed yet.
  const [hidingForAuth, setHidingForAuth] = useState(false);
  const hidingForAuthRef = useRef(false);
  const googleHandoffRef = useRef(false);
  // Seat focus on the email signup button rather than the panel's first
  // focusable (now Log in) or the Google button: Enter on an OAuth redirect
  // would fling a first-time visitor off-site before they read anything.
  const signUpButtonRef = useRef<HTMLButtonElement>(null);
  const flashedKey = useFlashedWelcomeShortcut();

  // The auth modal's openness lives in the URL (?auth=), so the welcome
  // screen simply hides while it is open and reappears when the browser
  // back button (or Escape) removes the param again.
  const visible =
    isOpen && !isAuthModalOpen && !authenticated && !hidingForAuth;

  useEffect(() => {
    if (isAuthModalOpen) return;
    hidingForAuthRef.current = false;
    setHidingForAuth(false);
  }, [isAuthModalOpen]);

  useEffect(() => {
    if (isGoogleAuthLoading) return;
    googleHandoffRef.current = false;
  }, [isGoogleAuthLoading]);

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

  useEffect(() => {
    welcomeGuideActions.setFirstVisitOpen(visible);
    return () => welcomeGuideActions.setFirstVisitOpen(false);
  }, [visible]);

  if (!visible) return null;

  // Fade the backdrop and gently scale the panel before unmounting, so the
  // first reveal of the sidebar underneath feels smooth rather than abrupt.
  const dismiss = (cta: "explore" | "dismissed" = "dismissed") => {
    if (
      closing ||
      hidingForAuthRef.current ||
      googleHandoffRef.current ||
      isGoogleAuthLoading
    )
      return;
    skipFocusRestoreRef.current = true;
    markWelcomeSeen();
    track("welcome_modal_dismissed", { cta });
    startShowcaseAfterDismissRef.current = true;
    // Start after this dialog unmounts so the practice takeover does not
    // share a focus trap with the fading welcome overlay.
    beginDismiss(() => {
      if (!startShowcaseAfterDismissRef.current) return;
      startShowcaseAfterDismissRef.current = false;
      setIsOpen(false);
      shortcutShowcaseActions.startFromWelcome();
    });
  };

  const beginAuthHandoff = () => {
    skipFocusRestoreRef.current = true;
    startShowcaseAfterDismissRef.current = false;
    hidingForAuthRef.current = true;
    setHidingForAuth(true);
    cancelDismiss();
  };

  const handOffToAuth = (cta: "log_in" | "sign_up") => {
    beginAuthHandoff();
    markWelcomeSeen();
    if (cta === "sign_up") {
      shortcutShowcaseActions.deferUntilSignup();
      track("signup_started", { source: "welcome_modal" });
    }
    track("welcome_modal_dismissed", { cta });
    openModal(cta === "log_in" ? "login" : "signUp");
  };

  // The shortest path to the thing that makes Compass worth keeping: one
  // round trip that signs the user up and grants calendar access together,
  // because the Google scopes Compass asks for include the calendar.
  const handOffToGoogle = () => {
    // Stay mounted: Google is a redirect, and a GIS error must not hide
    // welcome for the rest of the session. Ignore Explore while it loads.
    skipFocusRestoreRef.current = true;
    startShowcaseAfterDismissRef.current = false;
    googleHandoffRef.current = true;
    cancelDismiss();
    markWelcomeSeen();
    shortcutShowcaseActions.deferUntilSignup();
    track("welcome_modal_dismissed", { cta: "sign_up_google" });
    track("signup_started", { source: "welcome_modal_google" });
    void startGoogleAuthorization();
  };

  const handleShortcutKey = (e: React.KeyboardEvent) => {
    if (
      hidingForAuthRef.current ||
      googleHandoffRef.current ||
      isGoogleAuthLoading
    )
      return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = keyboardKey(e).toLowerCase();
    if (key === "g" && isGoogleAvailable) {
      e.preventDefault();
      handOffToGoogle();
    } else if (key === "u") {
      e.preventDefault();
      handOffToAuth("sign_up");
    } else if (key === "i") {
      e.preventDefault();
      handOffToAuth("log_in");
    } else if (key === "s") {
      e.preventDefault();
      dismiss("explore");
    }
  };

  return (
    <OverlayPanel
      align="start"
      ariaLabel="Welcome to Compass Calendar"
      backdropClassName="overflow-y-auto py-8"
      closing={closing}
      initialFocusRef={signUpButtonRef}
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
            <div className="pointer-events-none absolute left-full ml-1 flex -translate-x-1 items-center opacity-0 transition-all duration-200 ease-out group-focus-within:translate-x-0 group-focus-within:opacity-100 group-hover:translate-x-0 group-hover:opacity-100">
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
              onClick={() => handOffToAuth("log_in")}
              className="c-button-compact c-button-secondary rounded-3xl px-4 py-1.5 text-xs"
              {...pointerShortcutAttributes("i")}
            >
              Log in
              <ShortcutHint
                className={classNames(
                  "ml-2",
                  flashedShortcutClass(flashedKey, "i"),
                )}
              >
                i
              </ShortcutHint>
            </button>
          </div>
        </div>

        <WelcomeGuideBody flashedKey={flashedKey}>
          {/* CTA: connecting a calendar is the moment Compass starts being
              useful, so the Google round trip - which signs up and grants
              calendar access at once - leads, and everything else is a fallback
              from it. */}
          <div className="flex w-full flex-col items-center gap-3">
            {isGoogleAvailable && (
              <>
                <div
                  className={classNames(
                    "w-full",
                    flashedKey?.toLowerCase() === "g" && "c-shortcut-flash",
                  )}
                  {...pointerShortcutAttributes("G")}
                >
                  <GoogleButton
                    onClick={handOffToGoogle}
                    disabled={isGoogleAuthLoading}
                    label="Continue with Google"
                    shortcutKey="G"
                    style={{ width: "100%" }}
                  />
                </div>
                <p className="text-center text-text-muted text-xs">
                  Signs you up and connects your Google Calendar.
                </p>
              </>
            )}
            <button
              type="button"
              ref={signUpButtonRef}
              onClick={() => handOffToAuth("sign_up")}
              className="c-button c-button-primary c-button-elevated inline-flex h-10 w-full items-center justify-center rounded-full"
              {...pointerShortcutAttributes("U")}
            >
              {isGoogleAvailable ? "Sign up with email" : "Sign up"}
              <ShortcutHint
                className={classNames(
                  "ml-2",
                  flashedShortcutClass(flashedKey, "U"),
                )}
              >
                U
              </ShortcutHint>
            </button>
            <button
              type="button"
              onClick={() => dismiss("explore")}
              className="c-focus-ring inline-flex items-center rounded-md px-2 py-1 text-text-muted text-xs hover:bg-surface-overlay hover:text-text"
              {...pointerShortcutAttributes("S")}
            >
              Explore without an account
              <ShortcutHint
                className={classNames(
                  "ml-2",
                  flashedShortcutClass(flashedKey, "S"),
                )}
              >
                S
              </ShortcutHint>
            </button>
          </div>
        </WelcomeGuideBody>
      </div>
    </OverlayPanel>
  );
}
