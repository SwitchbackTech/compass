import { type FC, lazy, Suspense, useEffect, useRef } from "react";
import { ConnectProviderChooser } from "@web/auth/providers/ConnectProviderChooser";
import {
  CONNECT_CALENDAR_PROMPT_SUBTITLE,
  CONNECT_CALENDAR_PROMPT_TITLE,
  CONNECT_CALENDAR_REASSURANCE,
} from "@web/auth/providers/provider-copy.util";
import { MODAL_DISMISS_MS } from "@web/common/constants/motion.constants";
import { useDismissTransition } from "@web/common/hooks/useDismissTransition";
import { connectCalendarPromptActions } from "@web/components/ConnectCalendarPrompt/connect-calendar.store";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";

const LazyTooltipWrapper = lazy(() =>
  import("@web/components/Tooltip/TooltipWrapper").then((module) => ({
    default: module.TooltipWrapper,
  })),
);

export const CONNECT_CALENDAR_LATER_LABEL = "Skip for now";

export const CONNECT_CALENDAR_LATER_TOOLTIP =
  "You can always connect your calendar later in Settings.";

export const ConnectCalendarPrompt: FC = () => {
  const { closing, beginDismiss } = useDismissTransition(MODAL_DISMISS_MS);
  const skipFocusRestoreRef = useRef(false);

  const dismiss = () => beginDismiss(connectCalendarPromptActions.snooze);

  useEffect(() => {
    connectCalendarPromptActions.markShown();
  }, []);

  return (
    <OverlayPanel
      align="start"
      ariaLabel={CONNECT_CALENDAR_PROMPT_TITLE}
      backdropClassName="overflow-y-auto py-8"
      closing={closing}
      onDismiss={dismiss}
      skipFocusRestoreRef={skipFocusRestoreRef}
      widthClassName="w-120"
    >
      <div className="flex w-full flex-col gap-6">
        <div className="flex w-full flex-col gap-2">
          <h2 className="font-bold text-2xl text-text leading-snug">
            {CONNECT_CALENDAR_PROMPT_TITLE}
          </h2>
          <p className="text-sm text-text-muted">
            {CONNECT_CALENDAR_PROMPT_SUBTITLE}
          </p>
        </div>
        <ConnectProviderChooser variant="prompt" />
        <p className="text-text-muted text-xs">
          {CONNECT_CALENDAR_REASSURANCE}
        </p>
        <Suspense
          fallback={
            <button
              className="c-focus-ring self-center rounded-md px-2 py-1 text-text-muted text-xs hover:bg-surface-overlay hover:text-text"
              onClick={dismiss}
              title={CONNECT_CALENDAR_LATER_TOOLTIP}
              type="button"
            >
              {CONNECT_CALENDAR_LATER_LABEL}
            </button>
          }
        >
          <LazyTooltipWrapper
            asChild
            description={CONNECT_CALENDAR_LATER_TOOLTIP}
            placement="top"
          >
            <button
              className="c-focus-ring self-center rounded-md px-2 py-1 text-text-muted text-xs hover:bg-surface-overlay hover:text-text"
              onClick={dismiss}
              type="button"
            >
              {CONNECT_CALENDAR_LATER_LABEL}
            </button>
          </LazyTooltipWrapper>
        </Suspense>
      </div>
    </OverlayPanel>
  );
};
