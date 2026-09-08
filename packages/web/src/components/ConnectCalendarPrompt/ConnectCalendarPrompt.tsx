import { type FC, useRef } from "react";
import { ConnectProviderChooser } from "@web/auth/providers/ConnectProviderChooser";
import {
  CALENDAR_HOST_EXPLAINER,
  CONNECT_THE_CALENDAR_YOU_USE,
} from "@web/auth/providers/provider-copy.util";
import { MODAL_DISMISS_MS } from "@web/common/constants/motion.constants";
import { useDismissTransition } from "@web/common/hooks/useDismissTransition";
import { connectCalendarPromptActions } from "@web/components/ConnectCalendarPrompt/connect-calendar.store";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { pointerPassAttributes } from "@web/shortcuts/keyboard-only/pointer-action";

export const CONNECT_CALENDAR_LATER_LABEL = "I'll do this later";

export const ConnectCalendarPrompt: FC = () => {
  const { closing, beginDismiss } = useDismissTransition(MODAL_DISMISS_MS);
  const skipFocusRestoreRef = useRef(false);

  const dismiss = () => beginDismiss(connectCalendarPromptActions.dismiss);

  return (
    <OverlayPanel
      align="start"
      ariaLabel={CONNECT_THE_CALENDAR_YOU_USE}
      backdropClassName="overflow-y-auto py-8"
      closing={closing}
      onDismiss={dismiss}
      skipFocusRestoreRef={skipFocusRestoreRef}
      widthClassName="w-120"
    >
      <div className="flex w-full flex-col gap-6" {...pointerPassAttributes}>
        <div className="flex w-full flex-col gap-2">
          <h2 className="font-bold text-2xl text-text leading-snug">
            {CONNECT_THE_CALENDAR_YOU_USE}
          </h2>
          <p className="text-sm text-text-muted">{CALENDAR_HOST_EXPLAINER}</p>
        </div>
        <ConnectProviderChooser variant="prompt" />
        <button
          className="c-focus-ring self-center rounded-md px-2 py-1 text-text-muted text-xs hover:bg-surface-overlay hover:text-text"
          onClick={dismiss}
          type="button"
        >
          {CONNECT_CALENDAR_LATER_LABEL}
        </button>
      </div>
    </OverlayPanel>
  );
};
