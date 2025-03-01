import React from "react";
import { CalendarIcon } from "@web/components/Icons/Calendar";
import { CommandIcon } from "@web/components/Icons/Command";
import { TodoIcon } from "@web/components/Icons/Todo";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { selectSidebarTab } from "@web/ducks/events/selectors/view.selectors";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { IconRow, LeftIconGroup } from "../styled";

export const SidebarIconRow = () => {
  const dispatch = useAppDispatch();
  const tab = useAppSelector(selectSidebarTab);

  const isCmdPaletteOpen = useAppSelector(selectIsCmdPaletteOpen);

  const toggleCmdPalette = () => {
    if (isCmdPaletteOpen) {
      dispatch(settingsSlice.actions.closeCmdPalette());
    } else {
      dispatch(settingsSlice.actions.openCmdPalette());
    }
  };

  return (
    <IconRow>
      <LeftIconGroup>
        <TooltipWrapper
          description="Open command palette"
          shortcut="CMD + K"
          onClick={toggleCmdPalette}
        >
          <CommandIcon isFocused={isCmdPaletteOpen} />
        </TooltipWrapper>
        <TooltipWrapper
          description="Open tasks"
          shortcut="SHIFT + 1"
          onClick={() => dispatch(viewSlice.actions.updateSidebarTab("tasks"))}
        >
          <TodoIcon isFocused={tab === "tasks"} />
        </TooltipWrapper>
        <TooltipWrapper
          description="Open month"
          shortcut="SHIFT + 2"
          onClick={() =>
            dispatch(viewSlice.actions.updateSidebarTab("monthWidget"))
          }
        >
          <CalendarIcon isFocused={tab === "monthWidget"} />
        </TooltipWrapper>
      </LeftIconGroup>
    </IconRow>
  );
};
