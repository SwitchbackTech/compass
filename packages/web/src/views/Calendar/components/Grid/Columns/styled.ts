import styled from "styled-components";
import {
  DIVIDER_GRID,
  EVENT_WIDTH_MINIMUM,
} from "@web/views/Calendar/layout.constants";
import { Flex } from "@web/components/Flex";
import { GRID_MARGIN_LEFT } from "@web/views/Calendar/layout.constants";

export const Columns = styled(Flex)`
  position: absolute;
  width: calc(100% - ${GRID_MARGIN_LEFT}px);
  left: ${GRID_MARGIN_LEFT}px;
`;

export const StyledGridCol = styled.div<{ color: string }>`
  border-left: ${({ theme }) =>
    `${DIVIDER_GRID}px solid ${theme.color.gridLine.primary}`};
  background: ${({ color }) => color};
  flex-basis: 100%;
  height: 100%;
  min-width: ${EVENT_WIDTH_MINIMUM}px;
  position: relative;
`;

export const StyledGridCols = styled(Columns)`
  height: calc(24 * 100% / 11);
`;
