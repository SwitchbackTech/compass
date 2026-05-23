import { InfoIcon } from "@phosphor-icons/react";
import { SpinnerIcon } from "@web/components/Icons/Spinner";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { StatusDotPopover } from "./HeaderInfoIconPopover";
import { useHeaderInfo } from "./useHeaderInfo";

const ANONYMOUS_PROMPT_ICON_CLASSNAME =
  "origin-center transition-all duration-200 ease-out motion-safe:animate-sync-dot-pulse motion-safe:group-hover:animate-none";
const DOT_BUTTON_CLASSNAME = "inline-flex h-6 w-6 items-center justify-center";
const ANONYMOUS_PROMPT_WRAPPER_CLASSNAME = `${DOT_BUTTON_CLASSNAME} group rounded-full transition-colors duration-200 ease-out hover:bg-white/20 hover:ring-1 hover:ring-white/20`;

export const HeaderInfoIcon = () => {
  const { isAnonymousSignUpPrompt, sidebarStatus, isRepairing, syncTooltip } =
    useHeaderInfo();

  if (syncTooltip) {
    return (
      <div role="status" aria-live="polite" aria-label={syncTooltip}>
        <TooltipWrapper description={syncTooltip}>
          <span className={DOT_BUTTON_CLASSNAME}>
            <SpinnerIcon aria-hidden="true" />
          </span>
        </TooltipWrapper>
      </div>
    );
  }

  // Only render when user attention is needed
  if (!sidebarStatus.iconColor) {
    return null;
  }

  const iconClassName = isAnonymousSignUpPrompt
    ? ANONYMOUS_PROMPT_ICON_CLASSNAME
    : undefined;
  const icon = (
    <InfoIcon
      aria-hidden="true"
      className={iconClassName}
      style={{ color: sidebarStatus.iconColor }}
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
