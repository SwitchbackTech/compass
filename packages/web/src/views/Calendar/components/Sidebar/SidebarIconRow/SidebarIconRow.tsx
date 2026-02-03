import { useVersionCheck } from "@web/common/hooks/useVersionCheck";
import { theme } from "@web/common/styles/theme";
import { getModifierKeyIcon } from "@web/common/utils/shortcut/shortcut.util";
import { CalendarIcon } from "@web/components/Icons/Calendar";
import { CommandIcon } from "@web/components/Icons/Command";
import { DownloadIcon } from "@web/components/Icons/Download";
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
} from "@web/views/Calendar/components/Sidebar/styled";

export const SidebarIconRow = () => {
  const dispatch = useAppDispatch();
  const tab = useAppSelector(selectSidebarTab);
  const gCalImport = useAppSelector(selectImportGCalState);
  const isCmdPaletteOpen = useAppSelector(selectIsCmdPaletteOpen);
  const { isUpdateAvailable } = useVersionCheck();

  const toggleCmdPalette = () => {
    if (isCmdPaletteOpen) {
      dispatch(settingsSlice.actions.closeCmdPalette());
    } else {
      dispatch(settingsSlice.actions.openCmdPalette());
    }
  };

  const handleUpdateClick = () => {
    window.location.reload();
  };

  const getCommandPaletteShortcut = () => {
    return (
      <Text size="s" style={{ display: "flex", alignItems: "center" }}>
        {getModifierKeyIcon()} + K
      </Text>
    );
  };

  return (
    <IconRow>
      <LeftIconGroup>
        <TooltipWrapper
          description="Open command palette"
          shortcut={getCommandPaletteShortcut()}
          onClick={toggleCmdPalette}
        >
          <CommandIcon
            color={
              isCmdPaletteOpen
                ? theme.color.text.darkPlaceholder
                : theme.color.text.light
            }
          />
        </TooltipWrapper>
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
        {gCalImport.importing ? (
          <TooltipWrapper description="Importing your calendar events in the background">
            <SpinnerIcon disabled />
          </TooltipWrapper>
        ) : undefined}
        {isUpdateAvailable ? (
          <TooltipWrapper
            description="New version available! Click to refresh and get the latest updates."
            onClick={handleUpdateClick}
          >
            <DownloadIcon size={20} color={theme.color.primary.default} />
          </TooltipWrapper>
        ) : undefined}
      </LeftIconGroup>
    </IconRow>
  );
};
