import { useCallback, useEffect, useRef } from "react";

interface Options {
  isAuthModalOpen: boolean;
  closeAuthModal: () => void;
  onBackToWelcome: () => void;
}

/**
 * Lets the browser back button return from the auth modal to the welcome
 * screen.
 *
 * `pushAuthEntry` adds a history entry when the welcome screen hands off to
 * the auth modal. Pressing back pops that entry, closes the auth modal, and
 * re-shows the welcome screen. If the auth modal closes any other way
 * (Escape, backdrop, successful login), the leftover entry is consumed with a
 * silent `history.back()` so a later back press behaves natively.
 */
export function useWelcomeBackNav({
  isAuthModalOpen,
  closeAuthModal,
  onBackToWelcome,
}: Options) {
  const fromWelcomeRef = useRef(false);
  const suppressNextPopRef = useRef(false);
  const prevAuthOpenRef = useRef(isAuthModalOpen);

  const pushAuthEntry = useCallback(() => {
    fromWelcomeRef.current = true;
    window.history.pushState(
      { compassAuthFromWelcome: true },
      "",
      window.location.href,
    );
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (suppressNextPopRef.current) {
        suppressNextPopRef.current = false;
        return;
      }
      if (fromWelcomeRef.current && isAuthModalOpen) {
        fromWelcomeRef.current = false;
        closeAuthModal();
        onBackToWelcome();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isAuthModalOpen, closeAuthModal, onBackToWelcome]);

  useEffect(() => {
    const wasOpen = prevAuthOpenRef.current;
    prevAuthOpenRef.current = isAuthModalOpen;

    const closedWithoutBackPress =
      wasOpen &&
      !isAuthModalOpen &&
      fromWelcomeRef.current &&
      window.history.state?.compassAuthFromWelcome === true;

    if (closedWithoutBackPress) {
      fromWelcomeRef.current = false;
      suppressNextPopRef.current = true;
      window.history.back();
    }
  }, [isAuthModalOpen]);

  return { pushAuthEntry };
}
