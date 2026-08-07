import { type KeyboardEvent, type MouseEvent, useCallback } from "react";
import { MODAL_DISMISS_MS } from "@web/common/constants/motion.constants";
import { Z_INDEX_MODAL } from "@web/common/constants/web.constants";
import { useDismissTransition } from "@web/common/hooks/useDismissTransition";
import { useAppLockReason } from "@web/shortcuts/app-lock";
import { PixelPirate } from "./PixelPirate";
import { WelcomeGuideBody } from "./WelcomeGuideBody";
import { welcomeGuideActions } from "./welcome.guide.store";

export function WelcomeGuideModal() {
  const { closing, beginDismiss } = useDismissTransition(MODAL_DISMISS_MS);
  useAppLockReason("welcomeGuide", true);

  const focusOnMount = useCallback((node: HTMLDivElement | null) => {
    node?.focus();
  }, []);

  const dismiss = () => {
    beginDismiss(() => welcomeGuideActions.close());
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
    // biome-ignore lint/a11y/noStaticElementInteractions: The backdrop catches outside clicks and Escape to dismiss the welcome guide.
    <div
      className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-background/85 py-8 backdrop-blur-sm transition-opacity duration-400 ease-out data-closing:opacity-0 motion-reduce:transition-none"
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
        aria-label="Welcome to Compass Calendar"
        data-closing={closing || undefined}
        className="flex w-120 max-w-[90vw] flex-col gap-6 rounded-xl bg-surface-panel p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] transition-transform duration-400 ease-out data-closing:scale-105 motion-reduce:transition-none"
      >
        <PixelPirate className="h-14 w-14 shrink-0" />
        <WelcomeGuideBody />

        <div className="flex justify-center">
          <button
            type="button"
            onClick={dismiss}
            className="c-button c-button-primary c-button-elevated rounded-full px-10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
