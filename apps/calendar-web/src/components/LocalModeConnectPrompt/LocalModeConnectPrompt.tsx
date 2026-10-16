import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { type FC, useCallback, useContext, useEffect, useRef } from "react";
import { useSignInProviders } from "@web/auth/providers/useSignInProviders";
import { BANNER_DISMISS_MS } from "@web/common/constants/motion.constants";
import { Z_INDEX_TOOLTIP } from "@web/common/constants/web.constants";
import { useDismissTransition } from "@web/common/hooks/useDismissTransition";
import { AuthModalContext } from "@web/components/AuthModal/hooks/useAuthModal";
import IconButton from "@web/components/IconButton/IconButton";
import {
  localModeConnectPromptActions,
  selectLocalModeConnectPromptWriteCount,
  useLocalModeConnectPromptStore,
} from "@web/components/LocalModeConnectPrompt/local-mode-connect.store";
import { useLocalModeConnectPromptEligible } from "@web/components/LocalModeConnectPrompt/useLocalModeConnectPromptEligible";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

export const LOCAL_MODE_CONNECT_PROMPT_ARIA_LABEL = "Connect Google";

export const LOCAL_MODE_CONNECT_PROMPT_MESSAGE =
  "Connect Google to sync your events and start your free trial.";

export const LOCAL_MODE_CONNECT_PROMPT_CONNECT_LABEL = "Connect Google";

export const LOCAL_MODE_CONNECT_PROMPT_PH_CLASS = "ph-no-rageclick";

const shouldDelegateEnterToConnect = (
  active: Element | null,
  connectRef: HTMLButtonElement | null,
): boolean => {
  if (!connectRef) return false;
  if (active === connectRef) return true;
  if (active instanceof HTMLElement && active.isContentEditable) return false;
  const tag = active?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return false;
  return true;
};

export const LocalModeConnectPrompt: FC = () => {
  const { isOpen: isAuthModalOpen } = useContext(AuthModalContext);
  const isLive = useLocalModeConnectPromptEligible(isAuthModalOpen);
  const writeCount = useLocalModeConnectPromptStore(
    selectLocalModeConnectPromptWriteCount,
  );
  const { closing, beginDismiss } = useDismissTransition(BANNER_DISMISS_MS);
  const connectRef = useRef<HTMLButtonElement>(null);
  const { startSignIn, isLoading } = useSignInProviders({ signupFlow: true });

  const dismiss = useCallback(() => {
    beginDismiss(() => localModeConnectPromptActions.dismiss(writeCount));
  }, [beginDismiss, writeCount]);

  const connect = useCallback(() => {
    localModeConnectPromptActions.connect(writeCount);
    startSignIn("google");
  }, [startSignIn, writeCount]);

  useEffect(() => {
    localModeConnectPromptActions.syncFromStorage();
  }, []);

  useEffect(() => {
    if (!isLive) return;
    localModeConnectPromptActions.markShown(writeCount);
  }, [isLive, writeCount]);

  useAppShortcut("Escape", dismiss, {
    enabled: isLive && !closing,
    ignoreAppLock: true,
    preventDefault: true,
  });

  useAppShortcut(
    "Enter",
    (event) => {
      if (event.repeat) return;
      if (
        !shouldDelegateEnterToConnect(
          document.activeElement,
          connectRef.current,
        )
      ) {
        return;
      }
      connect();
    },
    {
      enabled: isLive && !closing,
      ignoreAppLock: true,
      preventDefault: true,
    },
  );

  if (!isLive) return null;

  return (
    <aside
      aria-label={LOCAL_MODE_CONNECT_PROMPT_ARIA_LABEL}
      className={`fixed right-6 bottom-6 starting:translate-y-2 starting:opacity-0 transition-all duration-300 data-closing:opacity-0 motion-reduce:transition-none ${LOCAL_MODE_CONNECT_PROMPT_PH_CLASS}`}
      data-closing={closing || undefined}
      data-local-mode-connect-prompt=""
      data-notice=""
      style={{ zIndex: Z_INDEX_TOOLTIP }}
    >
      <div className="flex w-80 flex-col gap-3 rounded-xl border border-border bg-surface/95 px-4 py-3 text-text shadow-xl backdrop-blur-2xl backdrop-saturate-150">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm leading-relaxed">
            {LOCAL_MODE_CONNECT_PROMPT_MESSAGE}
          </p>
          <IconButton
            aria-label="Dismiss"
            className="shrink-0 text-text-muted hover:text-text"
            onClick={dismiss}
            size="small"
          >
            <XIcon aria-hidden="true" size={14} />
          </IconButton>
        </div>
        <button
          className="c-button-compact c-button-primary inline-flex items-center justify-center self-start rounded-xs px-3 py-1.5 text-s data-busy:pointer-events-none data-busy:opacity-60"
          data-busy={isLoading || undefined}
          disabled={isLoading}
          onClick={connect}
          ref={connectRef}
          type="button"
        >
          {LOCAL_MODE_CONNECT_PROMPT_CONNECT_LABEL}
        </button>
      </div>
    </aside>
  );
};
