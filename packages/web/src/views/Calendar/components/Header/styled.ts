import styled from "styled-components";
import {
  EVENT_WIDTH_MINIMUM,
  PAGE_X_PADDING,
} from "@web/views/Calendar/layout.constants";
import { Flex } from "@web/components/Flex";
import { Text } from "@web/components/Text";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import {
  HEADER_HEIGHT,
  GRID_MARGIN_LEFT,
  WEEK_DAYS_MARGIN_Y,
} from "@web/views/Calendar/layout.constants";

export const ArrowNavigationButton = styled(Text)`
  align-items: center;
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

export const StyledHeaderLabel = styled.div`
  padding-right: 60px;
`;

export const StyledLeftGroup = styled(Flex)`
  align-items: ${AlignItems.CENTER};
`;

export const StyledHeaderRow = styled(Flex)`
  align-items: ${AlignItems.CENTER};
  font-size: 40px;
  justify-content: ${JustifyContent.SPACE_BETWEEN};
  margin-left: ${GRID_MARGIN_LEFT}px;
  height: ${HEADER_HEIGHT}px;
  width: 100%;
`;

export const StyledNavigationArrows = styled(Flex)`
  padding-left: 20px;
`;

export const StyledNavigationButtons = styled(Flex)`
  justify-content: space-between;
  margin-right: 50px;
  padding-left: 20px;
`;

export const StyledRightGroup = styled(Flex)`
  padding-right: ${PAGE_X_PADDING * 2}px;
`;

export const StyledWeekDaysFlex = styled(Flex)`
  width: calc(100% - ${GRID_MARGIN_LEFT}px);
  margin: ${WEEK_DAYS_MARGIN_Y}px 0 0 0;
  margin-left: ${GRID_MARGIN_LEFT}px;
`;

interface WeekDayFlexProps {
  color: string;
}

export const StyledWeekDayFlex = styled(Flex)<WeekDayFlexProps>`
  color: ${({ color }) => color};
  flex-basis: 100%;
  min-width: ${EVENT_WIDTH_MINIMUM}px;
`;
