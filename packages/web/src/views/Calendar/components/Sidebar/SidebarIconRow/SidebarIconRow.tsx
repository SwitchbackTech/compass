import { DotIcon } from "@phosphor-icons/react";
import { useConnectGoogle } from "@web/auth/hooks/google/useConnectGoogle/useConnectGoogle";
import { type DotColor } from "@web/auth/hooks/google/useConnectGoogle/useConnectGoogle.types";
import { useVersionCheck } from "@web/common/hooks/useVersionCheck";
import { theme } from "@web/common/styles/theme";
import { getModifierKeyIcon } from "@web/common/utils/shortcut/shortcut.util";
import { CalendarIcon } from "@web/components/Icons/Calendar";
import { CommandIcon } from "@web/components/Icons/Command";
import { RefreshIcon } from "@web/components/Icons/Refresh";
import { SpinnerIcon } from "@web/components/Icons/Spinner";
import { TodoIcon } from "@web/components/Icons/Todo";
import { Text } from "@web/components/Text";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { selectImportGCalState } from "@web/ducks/events/selectors/sync.selector";
import { selectSidebarTab } from "@web/ducks/events/selectors/view.selectors";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import {
  IconRow,
  LeftIconGroup,
  RightIconGroup,
} from "@web/views/Calendar/components/Sidebar/styled";
import { StatusDotPopover } from "./StatusDotPopover";

const DOT_COLOR_MAP: Record<DotColor, string> = {
  muted: theme.color.text.darkPlaceholder,
  warning: theme.color.status.warning,
  error: theme.color.status.error,
};

export const SidebarIconRow = () => {
  const dispatch = useAppDispatch();
  const tab = useAppSelector(selectSidebarTab);
  const gCalImport = useAppSelector(selectImportGCalState);
  const isCmdPaletteOpen = useAppSelector(selectIsCmdPaletteOpen);
  const { isUpdateAvailable } = useVersionCheck();
  const { sidebarStatus, isRepairing } = useConnectGoogle();
  const isBackgroundImporting = gCalImport.isProcessing === true;

  const handleUpdateReload = () => {
    window.location.reload();
  };

  const toggleCmdPalette = () => {
    if (isCmdPaletteOpen) {
      dispatch(settingsSlice.actions.closeCmdPalette());
    } else {
      dispatch(settingsSlice.actions.openCmdPalette());
    }
  };

  const getCommandPaletteShortcut = () => {
    return (
      <Text size="s" style={{ display: "flex", alignItems: "center" }}>
        {getModifierKeyIcon()} + K
      </Text>
    );
  };

  const dotColor = DOT_COLOR_MAP[sidebarStatus.dotColor ?? "muted"];

  return (
    <IconRow>
      <LeftIconGroup>
        <TooltipWrapper
          description="Open tasks"
          shortcut="SHIFT + 1"
          onClick={() => dispatch(viewSlice.actions.updateSidebarTab("tasks"))}
        >
          <TodoIcon
            color={
              tab === "tasks"
                ? theme.color.text.light
                : theme.color.text.darkPlaceholder
            }
          />
        </TooltipWrapper>
        <TooltipWrapper
          description="Open month"
          shortcut="SHIFT + 2"
          onClick={() =>
            dispatch(viewSlice.actions.updateSidebarTab("monthWidget"))
          }
        >
          <CalendarIcon
            color={
              tab === "monthWidget"
                ? theme.color.text.light
                : theme.color.text.darkPlaceholder
            }
          />
        </TooltipWrapper>
      </LeftIconGroup>
      <RightIconGroup>
        <TooltipWrapper
          description="Open command palette"
          shortcut={getCommandPaletteShortcut()}
          onClick={toggleCmdPalette}
        >
          <CommandIcon
            color={
              isCmdPaletteOpen
                ? theme.color.text.light
                : theme.color.text.darkPlaceholder
            }
          />
        </TooltipWrapper>
        <div
          role="status"
          aria-live="polite"
          aria-label={sidebarStatus.tooltip}
        >
          {sidebarStatus.icon === "SpinnerIcon" ? (
            <TooltipWrapper
              description={sidebarStatus.tooltip}
              disabled={sidebarStatus.isDisabled}
            >
              <SpinnerIcon
                aria-hidden="true"
                color={
                  sidebarStatus.tone === "warning"
                    ? theme.color.status.warning
                    : theme.color.status.info
                }
                size={24}
              />
            </TooltipWrapper>
          ) : sidebarStatus.dialog ? (
            <StatusDotPopover
              tooltip={sidebarStatus.tooltip}
              title={sidebarStatus.dialog.title}
              description={sidebarStatus.dialog.description}
              repairLabel={sidebarStatus.dialog.repairLabel}
              onRepair={sidebarStatus.dialog.onRepair}
              isRepairing={isRepairing}
            >
              <DotIcon
                aria-hidden="true"
                color={dotColor}
                size={24}
                weight="fill"
              />
            </StatusDotPopover>
          ) : (
            <TooltipWrapper
              description={sidebarStatus.tooltip}
              disabled={sidebarStatus.isDisabled}
              onClick={sidebarStatus.onSelect}
            >
              <DotIcon
                aria-hidden="true"
                color={dotColor}
                size={24}
                weight="fill"
              />
            </TooltipWrapper>
          )}
        </div>
        {isBackgroundImporting ? (
          <TooltipWrapper description="Importing your calendar events in the background">
            <SpinnerIcon />
          </TooltipWrapper>
        ) : undefined}
        {isUpdateAvailable ? (
          <TooltipWrapper
            description="Get latest version"
            onClick={handleUpdateReload}
          >
            <RefreshIcon color={theme.color.text.accent} />
          </TooltipWrapper>
        ) : undefined}
      </RightIconGroup>
    </IconRow>
  );
};
