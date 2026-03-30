import { InfoIcon } from "@phosphor-icons/react";
import { type IconColor } from "@web/auth/hooks/google/useConnectGoogle/useConnectGoogle.types";
import { theme } from "@web/common/styles/theme";
import { SpinnerIcon } from "@web/components/Icons/Spinner";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { StatusDotPopover } from "./HeaderInfoIconPopover";
import { useHeaderInfo } from "./useHeaderInfo";

const ICON_COLOR_MAP: Record<IconColor, string> = {
  muted: theme.color.text.darkPlaceholder,
  warning: theme.color.status.warning,
  error: theme.color.status.error,
};

const ANONYMOUS_PROMPT_ICON_CLASSNAME =
  "origin-center transition-all duration-200 ease-out motion-safe:animate-sync-dot-pulse motion-safe:group-hover:animate-none";
const BACKGROUND_IMPORT_TOOLTIP =
  "Importing your calendar events in the background";
const DOT_BUTTON_CLASSNAME = "inline-flex h-6 w-6 items-center justify-center";
const ANONYMOUS_PROMPT_WRAPPER_CLASSNAME = `${DOT_BUTTON_CLASSNAME} group rounded-full transition-colors duration-200 ease-out hover:bg-white/20 hover:ring-1 hover:ring-white/20`;

export const HeaderInfoIcon = () => {
  const {
    isAnonymousSignUpPrompt,
    isBackgroundImporting,
    sidebarStatus,
    isRepairing,
  } = useHeaderInfo();

  if (isBackgroundImporting) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={BACKGROUND_IMPORT_TOOLTIP}
      >
        <TooltipWrapper description={BACKGROUND_IMPORT_TOOLTIP}>
          <span className={DOT_BUTTON_CLASSNAME}>
            <SpinnerIcon aria-hidden="true" />
          </span>
        </TooltipWrapper>
      </div>
    );
  }

  // Only render when user attention is needed (warning or error states)
  if (
    sidebarStatus.iconColor !== "warning" &&
    sidebarStatus.iconColor !== "error"
  ) {
    return null;
  }

  const iconColor = ICON_COLOR_MAP[sidebarStatus.iconColor];
  const iconClassName = isAnonymousSignUpPrompt
    ? ANONYMOUS_PROMPT_ICON_CLASSNAME
    : undefined;
  const icon = (
    <InfoIcon
      aria-hidden="true"
      className={iconClassName}
      style={{ color: iconColor }}
      size={15}
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
