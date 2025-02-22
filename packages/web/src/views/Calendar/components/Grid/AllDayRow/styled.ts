import styled from "styled-components";
import { Flex } from "@web/components/Flex";
import {
  GRID_MARGIN_LEFT,
  GRID_PADDING_BOTTOM,
  GRID_Y_START,
  SCROLLBAR_WIDTH,
} from "@web/views/Calendar/layout.constants";
import { GRID_TIME_STEP } from "@web/views/Calendar/layout.constants";
import { Columns } from "../Columns/styled";

const gridHeight = `100% - (${GRID_Y_START}px + ${GRID_PADDING_BOTTOM}px)`;
const gridRowHeight = `(${gridHeight}) / 11`;
const interval = 60 / GRID_TIME_STEP;
const allDayRowHeight = `${gridRowHeight} / ${interval}`;

const gridWidth = `100% - ${SCROLLBAR_WIDTH}px`;

export const StyledAllDayColumns = styled(Columns)`
  height: 100%;
`;
export const StyledAllDayRow = styled(Flex)<{ rowsCount: number }>`
  border-bottom: ${({ theme }) => `2px solid ${theme.color.gridLine.primary}`};
  height: ${({ rowsCount }) =>
    `calc(${allDayRowHeight} * 2 + ${
      rowsCount * 2 || 1
    } * ${allDayRowHeight})`};
  position: relative;
  width: calc(${gridWidth});
`;

export const StyledEvents = styled.div`
  position: relative;
  height: 100%;
  width: 100%;
  margin-left: ${GRID_MARGIN_LEFT}px;
`;
