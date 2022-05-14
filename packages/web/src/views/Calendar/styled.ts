import styled from "styled-components";
import { ColorNames } from "@web/common/types/styles";
import { Flex } from "@web/components/Flex";
import { getColor } from "@web/common/utils/colors";
import { Text } from "@web/components/Text";

import {
  CALENDAR_GRID_MARGIN_LEFT,
  CALENDAR_TOP_PADDING,
  CALENDAR_X_PADDING,
  GRID_SCROLLBAR_WIDTH,
  CALENDAR_Y_START,
  MYSTERY_PADDING,
  WEEK_DAYS_MARGIN_Y,
} from "./calendar.constants";

export const gridDividerBorder = `1px solid ${getColor(ColorNames.GREY_4)}70`;
const allDayGridDividerBorder = `2px solid ${getColor(ColorNames.GREY_4)}70`;

export const Styled = styled(Flex)`
  width: 100vw;
  height: 100vh;
`;

export const StyledCalendar = styled(Flex)`
  flex-grow: 1;
  height: 100%;
  background: ${getColor(ColorNames.DARK_2)};
  padding: ${CALENDAR_TOP_PADDING}px ${CALENDAR_X_PADDING}px 0
    ${CALENDAR_X_PADDING}px;
`;

export const StyledHeaderFlex = styled(Flex)`
  font-size: 40px;
`;

export const StyledNavigationButtons = styled(Flex)`
  margin-left: 40px;
`;

export const ArrowNavigationButton = styled(Text)`
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;

  &:hover {
    border-radius: 50%;
    color: ${getColor(ColorNames.WHITE_1)};
  }

  &:first-child {
    margin-right: 24px;
  }
`;

export const StyledWeekDaysFlex = styled(Flex)`
  width: calc(100% - ${CALENDAR_GRID_MARGIN_LEFT}px);
  margin: ${WEEK_DAYS_MARGIN_Y}px 0 0 0;
  margin-left: ${CALENDAR_GRID_MARGIN_LEFT}px;
`;

export interface StyledWeekDayFlexProps {
  flexBasis: number;
  color: string;
}

export const StyledWeekDayFlex = styled(Flex)<StyledWeekDayFlexProps>`
  flex-basis: ${({ flexBasis }) => flexBasis}%;
  min-width: 80px;
  color: ${({ color }) => color};
`;

export interface AllDayEventsGridProps {
  rowsCount: number;
}

const gridWidth = `100% - ${GRID_SCROLLBAR_WIDTH}px`;
const gridHeight = `100% - (${CALENDAR_Y_START}px + ${MYSTERY_PADDING}px)`;
const gridCellHeight = `(${gridHeight}) / 11`;
const allDayHeight = `${gridCellHeight} / 4`;

export const StyledAllDayEventsGrid = styled(Flex)<AllDayEventsGridProps>`
  height: ${({ rowsCount }) =>
    `calc(${allDayHeight} * 2 + ${rowsCount * 2 || 1} * ${allDayHeight})`};
  width: calc(${gridWidth});
  position: relative;
  border-bottom: ${allDayGridDividerBorder};
`;

export const StyledGridColumns = styled(Flex)`
  position: absolute;
  width: calc(100% - ${CALENDAR_GRID_MARGIN_LEFT}px);
  height: calc(24 * 100% / 11);
  left: ${CALENDAR_GRID_MARGIN_LEFT}px;
`;

export interface StyledGridColProps {
  flexBasis: number;
}

export const StyledGridCol = styled.div<StyledGridColProps>`
  min-width: 80px;
  flex-basis: ${({ flexBasis }) => flexBasis}%;
  border-left: ${gridDividerBorder};
  height: 100%;
  position: relative;
`;

export const StyledEvents = styled.div`
  position: relative;
  height: 100%;
  width: 100%;
  margin-left: ${CALENDAR_GRID_MARGIN_LEFT}px;
`;
