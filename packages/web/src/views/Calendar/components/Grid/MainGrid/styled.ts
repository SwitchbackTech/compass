import styled from "styled-components";
import { Flex } from "@web/components/Flex";
import {
  DIVIDER_GRID,
  GRID_MARGIN_LEFT,
  GRID_PADDING_BOTTOM,
  SCROLLBAR_WIDTH,
} from "@web/views/Calendar/layout.constants";

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
  width: calc(100% - ${GRID_MARGIN_LEFT}px - ${SCROLLBAR_WIDTH}px);
  height: 100%;
  left: ${GRID_MARGIN_LEFT}px;
`;
export const StyledMainGrid = styled.div`
  --scrollbar-width: 0px;
  flex: 1;
  margin-bottom: ${GRID_PADDING_BOTTOM}px;
  min-height: 0;
  width: 100%;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
`;
