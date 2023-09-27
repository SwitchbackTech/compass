import styled from "styled-components";
import { ColorNames } from "@core/types/color.types";
import { getColor } from "@core/util/color.utils";
import { Flex } from "@web/components/Flex";
import {
  DIVIDER_ALLDAY,
  SCROLLBAR_WIDTH,
  GRID_MARGIN_LEFT,
  GRID_Y_START,
  GRID_PADDING_BOTTOM,
} from "@web/views/Calendar/layout.constants";
import { GRID_TIME_STEP } from "@web/views/Calendar/layout.constants";

export interface AllDayRowProps {
  rowsCount: number;
}

const allDayRowDivider = `${DIVIDER_ALLDAY}px solid ${getColor(
  ColorNames.GREY_4
)}70`;

const gridHeight = `100% - (${GRID_Y_START}px + ${GRID_PADDING_BOTTOM}px)`;
const gridRowHeight = `(${gridHeight}) / 11`;
const interval = 60 / GRID_TIME_STEP;
const allDayRowHeight = `${gridRowHeight} / ${interval}`;

const gridWidth = `100% - ${SCROLLBAR_WIDTH}px`;

export const StyledAllDayRow = styled(Flex)<AllDayRowProps>`
  border-bottom: ${allDayRowDivider};
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
