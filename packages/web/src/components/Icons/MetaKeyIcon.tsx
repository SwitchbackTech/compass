import React from "react";
import { getColor } from "@core/util/color.utils";
import { ColorNames } from "@core/types/color.types";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";

import { StyledMetaKeyIcon } from "../Svg";
import { TooltipWrapper } from "../Tooltip/TooltipWrapper";

export const MetaKeyIcon = () => {
  const dispatch = useAppDispatch();

  const isCmdPaletteOpen = useAppSelector(selectIsCmdPaletteOpen);

  return (
    <TooltipWrapper
      description="Open command palette (Cmd + K)"
      onClick={() => {
        if (isCmdPaletteOpen) {
          dispatch(settingsSlice.actions.closeCmdPalette());
        } else {
          dispatch(settingsSlice.actions.openCmdPalette());
        }
      }}
    >
      <StyledMetaKeyIcon hovercolor={getColor(ColorNames.WHITE_1)} />
    </TooltipWrapper>
  );
};
