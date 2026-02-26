import styled from "styled-components";
import { ZIndex } from "@web/common/constants/web.constants";
import { c } from "@web/common/styles/colors";
import { Flex } from "@web/components/Flex";
import { JustifyContent } from "@web/components/Flex/styled";
import { Text } from "@web/components/Text";

// Constants
export const HEADER_HEIGHT = 80;
export const GRID_MARGIN_LEFT = 60;
export const WEEK_DAYS_MARGIN_Y = 10;
export const EVENT_WIDTH_MINIMUM = 100;

// Header components
export const StyledHeaderRow = styled(Flex)`
  color: ${c.gray100};
  font-size: 40px;
  justify-content: ${JustifyContent.SPACE_BETWEEN};
  height: ${HEADER_HEIGHT}px;
  width: 100%;
  position: relative;
  align-items: center;
`;

export const StyledLeftGroup = styled(Flex)`
  align-items: center;
  justify-content: space-between;
  z-index: ${ZIndex.LAYER_2};
`;

export const StyledRightGroup = styled(Flex)`
  align-items: center;
  flex-direction: row;
  justify-content: space-between;
  height: 100%;
  z-index: ${ZIndex.LAYER_2};
`;

export const StyledHeaderLabel = styled(Flex)`
  padding-left: 20px;
  color: ${c.gray100};
`;

export const StyledNavigationGroup = styled(Flex)`
  align-items: center;
  justify-content: space-between;
  margin-right: 20px;
`;

export const StyledNavigationArrows = styled(Flex)`
  padding-left: 20px;
  align-items: center;
`;

export const ArrowNavigationButton = styled(Text)`
  display: flex;
  justify-content: center;
  height: 30px;
  user-select: none;
  width: 30px;

  &:hover {
    border-radius: 50%;
    filter: brightness(160%);
    transition: filter 0.35s ease-out;
  }

  &:first-child {
    margin-right: 12px;
  }
`;

// Week days components
export const StyledWeekDaysFlex = styled(Flex)`
  width: 100%;
  margin: ${WEEK_DAYS_MARGIN_Y}px 0 0 0;
  /* margin-left: ${GRID_MARGIN_LEFT}px; */
`;

export const StyledWeekDayFlex = styled(Flex)<{ color: string }>`
  color: ${({ color }) => color};
  flex-basis: 100%;
  min-width: ${EVENT_WIDTH_MINIMUM}px;
`;

export const StyledMonthLabel = styled(Text)`
  font-size: 24px;
  color: ${c.gray100};
  margin-left: 20px;
`;

// Today button
export const StyledTodayButton = styled.button`
  background: transparent;
  color: ${c.gray100};
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 14px;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;
