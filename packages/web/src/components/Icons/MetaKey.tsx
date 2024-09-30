import React from "react";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";

import { TooltipWrapper } from "../Tooltip/TooltipWrapper";
import { StyledCommandIcon } from "./Command";

export const MetaKeyIcon = () => {
  const dispatch = useAppDispatch();

  const isCmdPaletteOpen = useAppSelector(selectIsCmdPaletteOpen);

  return (
    <TooltipWrapper
      description="Open command palette"
      shortcut="Cmd + K"
      onClick={() => {
        if (isCmdPaletteOpen) {
          dispatch(settingsSlice.actions.closeCmdPalette());
        } else {
          dispatch(settingsSlice.actions.openCmdPalette());
        }
      }}
    >
      <StyledCommandIcon size={25} />
    </TooltipWrapper>
  );
};
