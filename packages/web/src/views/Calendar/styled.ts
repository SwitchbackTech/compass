import styled from "styled-components";
import { ColorNames } from "@web/common/types/styles";
import { Flex } from "@web/components/Flex";
import { getAlphaColor, getColor } from "@web/common/utils/colors";
import { Text } from "@web/components/Text";

import {
  CALENDAR_GRID_MARGIN_LEFT,
  CALENDAR_TOP_PADDING,
  CALENDAR_X_PADDING,
  GRID_SCROLLBAR_WIDTH,
  GRID_Y_OFFSET,
  MYSTERY_PADDING,
  WEEK_DAYS_MARGIN_Y,
} from "./constants";

const gridDividerBorder = `1px solid ${getColor(ColorNames.GREY_4)}70`;

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
    background-color: ${getColor(ColorNames.BLUE_5)};
    color: ${getColor(ColorNames.DARK_2)};
  }

  &:first-child {
    margin-right: 24px;
  }
`;

export const TodayNavigationButton = styled(Text)`
  margin-left: 15px;

  &:hover {
    border-radius: 0;
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
  rowsCount?: number;
}

const gridWidth = `100% - ${GRID_SCROLLBAR_WIDTH}px`;
const gridHeight = `100% - (${GRID_Y_OFFSET}px + ${MYSTERY_PADDING}px)`;
const gridCellHeight = `(${gridHeight}) / 11`;
const allDayHeight = `${gridCellHeight} / 4`;

/* orig height calc: $$
 `calc(${allDayHeight} * 2 + ${rowsCount + 5 || 1} * ${allDayHeight})`}; */

export const StyledAllDayEventsGrid = styled(Flex)<AllDayEventsGridProps>`
  height: ${({ rowsCount }) =>
    `calc(${allDayHeight} * 2 + ${rowsCount * 2 || 1} * ${allDayHeight})`};
  width: calc(${gridWidth});
  position: relative;
  overflow: hidden;
  border-bottom: ${gridDividerBorder};
`;

export const StyledEventsGrid = styled.div`
  flex: 1;
  margin-bottom: 20px;
  width: 100%;
  position: relative;
  overflow-y: visible;
  overflow-x: hidden;

  /* 
  webkit-scrollbar isn't standardized among browsers, 
  meaning it could break on some broswers or after a browser update.
  (see: https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-scrollbar
  it's used here nonetheless because it was an easy way to get the grid widths
  to align correctly
  */
  ::-webkit-scrollbar {
    width: ${GRID_SCROLLBAR_WIDTH}px;
  }
  ::-webkit-scrollbar-thumb {
    border-radius: 7px;
    background: ${getColor(ColorNames.DARK_3)};
    &:hover {
      background: ${getColor(ColorNames.DARK_4)};
      transition: background-color 0.2s;
    }
  }
`;

export interface PrevDaysOverflowProps {
  widthPercent: number;
}

export const StyledPrevDaysOverflow = styled.div<PrevDaysOverflowProps>`
  width: ${({ widthPercent }) => widthPercent}%;
  height: 100%;
  background: ${getColor(ColorNames.WHITE_1)};
  opacity: 0.03;
  position: absolute;
`;

export const StyledDayTimes = styled.div`
  position: absolute;
  height: 100%;
  top: calc(100% / 11 + -5px);
  z-index: 2;
  color: ${getColor(ColorNames.WHITE_4)}80;

  & > div {
    height: calc(100% / 11);

    & > span {
      display: block;
    }
  }
`;

export const StyledGridColumns = styled(Flex)`
  position: absolute;
  width: calc(100% - ${CALENDAR_GRID_MARGIN_LEFT}px);
  height: calc(24 * 100% / 11);
  left: ${CALENDAR_GRID_MARGIN_LEFT}px;
`;

export const StyledGridRows = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  left: 35px;
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

export const StyledGridRow = styled(Flex)`
  height: calc(100% / 11);
  border-bottom: ${gridDividerBorder};
  width: 100%;
  position: relative;

  & > span {
    position: absolute;
    bottom: -5px;
    left: -${CALENDAR_GRID_MARGIN_LEFT}px;
  }
`;

export const StyledEvents = styled.div`
  position: relative;
  height: 100%;
  width: 100%;
  margin-left: ${CALENDAR_GRID_MARGIN_LEFT}px;
`;

export const StyledTodayPopoverContainer = styled(Flex)`
  padding: 12px;
  background: ${getAlphaColor(ColorNames.DARK_1, 0.8)};
`;
