import classNames from "classnames";
import { type FC, useCallback, useSyncExternalStore } from "react";
import { type Calendar } from "@core/types/calendar.contracts";
import {
  shouldShowAnonymousCalendarChangeSignUpPrompt,
  subscribeToAuthState,
} from "@web/auth/compass/state/auth.state.util";
import {
  trackLocalModeSelected,
  trackSignupStartedAtClick,
} from "@web/auth/posthog/signup-funnel";
import {
  LOCAL_DEVICE_ONLY_LABEL,
  LOCAL_DEVICE_ONLY_SUBTITLE,
} from "@web/auth/providers/provider-copy.util";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@web/components/Tooltip/Tooltip";

export const ANONYMOUS_CALENDAR_ROW_TRIAL_MESSAGE =
  "Start your free trial to sync";

const ANONYMOUS_ROW_ARIA_LABEL = "Start your free trial to save this calendar";

const TOOLTIP_ACTION_BUTTON_CLASSNAME =
  "c-button-compact c-button-primary self-start rounded-xs px-2 py-1 text-s";

interface AnonymousCalendarRowProps {
  calendar: Calendar;
}

export const AnonymousCalendarRow: FC<AnonymousCalendarRowProps> = ({
  calendar,
}) => {
  const { openModal } = useAuthModal();
  const isDirty = useSyncExternalStore(
    subscribeToAuthState,
    shouldShowAnonymousCalendarChangeSignUpPrompt,
    shouldShowAnonymousCalendarChangeSignUpPrompt,
  );
  const handleLocalModeSelected = useCallback(() => {
    trackLocalModeSelected("anon_nudge");
  }, []);

  const handleOpenSignUp = useCallback(() => {
    void trackSignupStartedAtClick("anon_nudge");
    openModal("signUp");
  }, [openModal]);

  return (
    <li className="flex min-w-0 items-center gap-1">
      <Tooltip interactive>
        <TooltipTrigger asChild>
          <button
            aria-label={ANONYMOUS_ROW_ARIA_LABEL}
            className={classNames(
              "c-focus-ring flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-0.5 text-left text-xs",
              isDirty
                ? "c-sync-text-wave"
                : "text-text-muted hover:bg-surface-panel hover:text-text",
            )}
            onClick={handleLocalModeSelected}
            type="button"
          >
            <span
              aria-hidden
              className="size-3.5 shrink-0 rounded-full border-2"
              style={{
                backgroundColor: calendar.backgroundColor,
                borderColor: calendar.backgroundColor,
              }}
            />
            <span className="min-w-0 flex-1 truncate">
              {LOCAL_DEVICE_ONLY_LABEL}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent className="flex max-w-55 flex-col gap-1.5">
          <span>{LOCAL_DEVICE_ONLY_SUBTITLE}</span>
          <span>{ANONYMOUS_CALENDAR_ROW_TRIAL_MESSAGE}</span>
          <button
            className={TOOLTIP_ACTION_BUTTON_CLASSNAME}
            onClick={handleOpenSignUp}
            type="button"
          >
            Start free trial
          </button>
        </TooltipContent>
      </Tooltip>
    </li>
  );
};
