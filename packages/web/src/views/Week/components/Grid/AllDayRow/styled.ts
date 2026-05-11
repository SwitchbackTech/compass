import styled from "styled-components";
import { Flex } from "@web/components/Flex";
import {
  GRID_MARGIN_LEFT,
  GRID_PADDING_BOTTOM,
  GRID_TIME_STEP,
  GRID_Y_START,
} from "@web/views/Week/layout.constants";
import { Columns } from "../Columns/styled";

const gridHeight = `100% - (${GRID_Y_START}px + ${GRID_PADDING_BOTTOM}px)`;
const gridRowHeight = `(${gridHeight}) / 11`;
const interval = 60 / GRID_TIME_STEP;
const allDayRowHeight = `${gridRowHeight} / ${interval}`;

export const StyledAllDayColumns = styled(Columns)`
  height: 100%;

  &::before {
    background: ${({ theme }) => theme.color.gridLine.primary};
    bottom: 0;
    content: "";
    height: 2px;
    left: 0;
    pointer-events: none;
    position: absolute;
    right: 0;
  }
`;
export const StyledAllDayRow = styled(Flex)<{ rowsCount: number }>`
  flex-shrink: 0;
  height: ${({ rowsCount }) =>
    `calc(${allDayRowHeight} * 2 + ${
      rowsCount * 2 || 1
    } * ${allDayRowHeight})`};
  position: relative;
  width: 100%;
`;

export const StyledEvents = styled.div`
  position: relative;
  height: 100%;
  width: 100%;
  margin-left: ${GRID_MARGIN_LEFT}px;
`;
