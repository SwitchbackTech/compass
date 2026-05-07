import styled from "styled-components";
import {
  DIVIDER_GRID,
  EVENT_WIDTH_MINIMUM,
  GRID_MARGIN_LEFT,
} from "@web/views/Week/layout.constants";

export const Columns = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(${EVENT_WIDTH_MINIMUM}px, 1fr));
  left: ${GRID_MARGIN_LEFT}px;
  position: absolute;
  top: 0;
  width: calc(100% - ${GRID_MARGIN_LEFT}px);
`;

export const StyledGridCol = styled.div<{ $color: string | null }>`
  border-left: ${({ theme }) =>
    `${DIVIDER_GRID}px solid ${theme.color.gridLine.primary}`};
  box-sizing: border-box;
  background: ${({ $color }) => $color};
  height: 100%;
  min-width: ${EVENT_WIDTH_MINIMUM}px;
  position: relative;
`;

export const StyledGridCols = styled(Columns)`
  height: calc(24 * 100% / 11);
`;
