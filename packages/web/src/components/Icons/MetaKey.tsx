import React from "react";
import styled from "styled-components";
import { Command } from "@phosphor-icons/react";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";

import { TooltipWrapper } from "../Tooltip/TooltipWrapper";
import { IconProps } from "./icon.types";

const StyledCommandIcon = styled(Command)`
  color: ${({ theme }) => theme.color.text.lighter};
  transition: filter 0.2s ease;

  &:hover {
    filter: brightness(130%);
  }
`;

export const MetaKeyIcon: React.FC<IconProps> = (props) => {
  const dispatch = useAppDispatch();

  const isCmdPaletteOpen = useAppSelector(selectIsCmdPaletteOpen);

  return (
    <TooltipWrapper
      description="Open command palette"
      shortcut="CMD + K"
      onClick={() => {
        if (isCmdPaletteOpen) {
          dispatch(settingsSlice.actions.closeCmdPalette());
        } else {
          dispatch(settingsSlice.actions.openCmdPalette());
        }
      }}
    >
      <StyledCommandIcon {...props} />
    </TooltipWrapper>
  );
};
