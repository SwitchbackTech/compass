import styled from "styled-components";
import { brighten } from "@core/util/color.utils";
import { Flex } from "@web/components/Flex";
import {
  GRID_PADDING_BOTTOM,
  SCROLLBAR_WIDTH,
} from "@web/views/Calendar/layout.constants";
import { GRID_MARGIN_LEFT } from "@web/views/Calendar/layout.constants";
import { DIVIDER_GRID } from "@web/views/Calendar/layout.constants";

export const StyledGridRow = styled(Flex)`
  height: calc(100% / 11);
  border-bottom: ${({ theme }) =>
    `${DIVIDER_GRID}px solid ${theme.color.gridLine.primary}`};
  width: 100%;
  position: relative;

  & > span {
    position: absolute;
    bottom: -5px;
    left: -${GRID_MARGIN_LEFT}px;
  }
`;
export const StyledGridWithTimeLabels = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  left: 35px;
`;
export const StyledMainGrid = styled.div`
  flex: 1;
  margin-bottom: ${GRID_PADDING_BOTTOM}px;
  width: 100%;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;

  /* Always reserve scrollbar space */
  &::-webkit-scrollbar {
    width: ${SCROLLBAR_WIDTH}px;
  }

  /* Hide the scrollbar thumb by default (transparent) */
  &::-webkit-scrollbar-thumb {
    background-color: transparent;
    border-radius: 7px;
    transition: background-color 0.3s ease;
  }

  /* On hover, make the scrollbar thumb visible */
  &:hover::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => brighten(theme.color.bg.primary, 10)};
  }

  /* Optional: even more visible on hover of the thumb itself */
  &:hover::-webkit-scrollbar-thumb:hover {
    background-color: ${({ theme }) => brighten(theme.color.bg.primary, 20)};
  }
`;
