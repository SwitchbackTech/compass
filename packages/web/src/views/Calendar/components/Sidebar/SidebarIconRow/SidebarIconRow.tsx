import React from "react";
import { CommandIcon } from "@web/components/Icons/Command";
import { CalendarIcon } from "@web/components/Icons/Calendar";
import { TodoIcon } from "@web/components/Icons/Todo";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { selectSidebarTab } from "@web/ducks/events/selectors/view.selectors";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { viewSlice } from "@web/ducks/events/slices/view.slice";

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
          <CommandIcon isFocused={isCmdPaletteOpen} size={25} />
        </TooltipWrapper>
        <TooltipWrapper
          description="Open tasks"
          shortcut="SHIFT + 1"
          onClick={() => dispatch(viewSlice.actions.updateSidebarTab("tasks"))}
        >
          <TodoIcon isFocused={tab === "tasks"} size={25} />
        </TooltipWrapper>
        <TooltipWrapper
          description="Open month"
          shortcut="SHIFT + 2"
          onClick={() =>
            dispatch(viewSlice.actions.updateSidebarTab("monthWidget"))
          }
        >
          <CalendarIcon isFocused={tab === "monthWidget"} size={25} />
        </TooltipWrapper>
      </LeftIconGroup>
    </IconRow>
  );
};
