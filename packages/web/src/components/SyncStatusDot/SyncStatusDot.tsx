import { type DotColor } from "@web/auth/hooks/google/useConnectGoogle/useConnectGoogle.types";
import { theme } from "@web/common/styles/theme";
import { CircleIcon } from "@web/components/Icons/CircleIcon";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { StatusDotPopover } from "./SyncStatusDotPopover";
import { useSyncStatusDotState } from "./useSyncStatusDotState";

const DOT_COLOR_MAP: Record<DotColor, string> = {
  muted: theme.color.text.darkPlaceholder,
  warning: theme.color.status.warning,
  error: theme.color.status.error,
};

const ANONYMOUS_PROMPT_ICON_CLASSNAME =
  "origin-center transition-all duration-200 ease-out motion-safe:animate-sync-dot-pulse motion-safe:group-hover:animate-none";
const DOT_BUTTON_CLASSNAME = "inline-flex h-6 w-6 items-center justify-center";
const ANONYMOUS_PROMPT_WRAPPER_CLASSNAME = `${DOT_BUTTON_CLASSNAME} group rounded-full transition-colors duration-200 ease-out hover:bg-white/20 hover:ring-1 hover:ring-white/20`;

export const SyncStatusDot = () => {
  const { isAnonymousSignUpPrompt, sidebarStatus, isRepairing } =
    useSyncStatusDotState();

  // Only render when user attention is needed (warning or error states)
  if (
    sidebarStatus.dotColor !== "warning" &&
    sidebarStatus.dotColor !== "error"
  ) {
    return null;
  }

  const dotColor = DOT_COLOR_MAP[sidebarStatus.dotColor];
  const iconClassName = isAnonymousSignUpPrompt
    ? ANONYMOUS_PROMPT_ICON_CLASSNAME
    : undefined;
  const icon = (
    <CircleIcon
      aria-hidden="true"
      className={iconClassName}
      style={{
        color: dotColor,
      }}
    />
  );
  const wrappedIcon = isAnonymousSignUpPrompt ? (
    <span className={ANONYMOUS_PROMPT_WRAPPER_CLASSNAME}>{icon}</span>
  ) : (
    <span className={DOT_BUTTON_CLASSNAME}>{icon}</span>
  );

  return (
    <div role="status" aria-live="polite" aria-label={sidebarStatus.tooltip}>
      {sidebarStatus.dialog ? (
        <StatusDotPopover
          tooltip={sidebarStatus.tooltip}
          title={sidebarStatus.dialog.title}
          description={sidebarStatus.dialog.description}
          repairLabel={sidebarStatus.dialog.repairLabel}
          onRepair={sidebarStatus.dialog.onRepair}
          isRepairing={isRepairing}
        >
          {wrappedIcon}
        </StatusDotPopover>
      ) : (
        <TooltipWrapper
          description={sidebarStatus.tooltip}
          disabled={sidebarStatus.isDisabled}
          onClick={sidebarStatus.onSelect}
        >
          {wrappedIcon}
        </TooltipWrapper>
      )}
    </div>
  );
};
