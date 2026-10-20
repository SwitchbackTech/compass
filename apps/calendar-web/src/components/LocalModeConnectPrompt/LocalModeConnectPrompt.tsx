import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { type FC, useCallback, useContext, useEffect } from "react";
import { PH_NO_RAGECLICK_CLASS } from "@web/auth/posthog/posthog-calendar-grid.util";
import { BANNER_DISMISS_MS } from "@web/common/constants/motion.constants";
import { Z_INDEX_TOOLTIP } from "@web/common/constants/web.constants";
import { useDismissTransition } from "@web/common/hooks/useDismissTransition";
import { AuthModalContext } from "@web/components/AuthModal/hooks/useAuthModal";
import IconButton from "@web/components/IconButton/IconButton";
import { localModeConnectPromptActions } from "@web/components/LocalModeConnectPrompt/local-mode-connect.store";
import { useLocalModeConnectPromptEligible } from "@web/components/LocalModeConnectPrompt/useLocalModeConnectPromptEligible";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import {
  TOAST_PRIMARY_ACTION_KEY,
  useNoticeActionShortcut,
} from "@web/shortcuts/notice-focus/useNoticeActionShortcut";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

export const LOCAL_MODE_CONNECT_PROMPT_ARIA_LABEL = "Start your free trial";

export const LOCAL_MODE_CONNECT_PROMPT_MESSAGE =
  "Start your free trial to save this calendar on every device.";

export const LOCAL_MODE_CONNECT_PROMPT_CONNECT_LABEL = "Start free trial";

export const LocalModeConnectPrompt: FC = () => {
  const { isOpen: isAuthModalOpen, openModal } = useContext(AuthModalContext);
  const { isLive, writeCount } =
    useLocalModeConnectPromptEligible(isAuthModalOpen);
  const { closing, beginDismiss } = useDismissTransition(BANNER_DISMISS_MS);

  const dismiss = useCallback(() => {
    beginDismiss(() => localModeConnectPromptActions.dismiss(writeCount));
  }, [beginDismiss, writeCount]);

  const startTrial = useCallback(() => {
    localModeConnectPromptActions.connect(writeCount);
    openModal("signUp");
  }, [openModal, writeCount]);

  useEffect(() => {
    localModeConnectPromptActions.syncFromStorage();
  }, []);

  useEffect(() => {
    if (!isLive) return;
    localModeConnectPromptActions.markShown(writeCount);
  }, [isLive, writeCount]);

  useNoticeActionShortcut(TOAST_PRIMARY_ACTION_KEY, startTrial, {
    enabled: isLive && !closing,
  });

  useAppShortcut("Escape", dismiss, {
    enabled: isLive && !closing,
    ignoreAppLock: true,
    preventDefault: true,
  });

  if (!isLive) return null;

  return (
    <aside
      aria-label={LOCAL_MODE_CONNECT_PROMPT_ARIA_LABEL}
      className={`fixed right-6 bottom-6 starting:translate-y-2 starting:opacity-0 transition-all duration-300 data-closing:opacity-0 motion-reduce:transition-none ${PH_NO_RAGECLICK_CLASS}`}
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
          className="c-button-compact c-button-primary inline-flex items-center justify-center gap-2 self-start rounded-xs px-3 py-1.5 text-s"
          onClick={startTrial}
          type="button"
        >
          {LOCAL_MODE_CONNECT_PROMPT_CONNECT_LABEL}
          <ShortcutKeys keys={TOAST_PRIMARY_ACTION_KEY} />
        </button>
      </div>
    </aside>
  );
};
