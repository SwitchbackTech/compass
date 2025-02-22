import styled from "styled-components";
import { Flex } from "@web/components/Flex";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { Text } from "@web/components/Text";
import {
  EVENT_WIDTH_MINIMUM,
  PAGE_MARGIN_X,
} from "@web/views/Calendar/layout.constants";
import {
  GRID_MARGIN_LEFT,
  HEADER_HEIGHT,
  WEEK_DAYS_MARGIN_Y,
} from "@web/views/Calendar/layout.constants";

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

export const StyledHeaderLabel = styled.div`
  padding-right: 60px;
`;

export const StyledLeftGroup = styled(Flex)`
  align-items: ${AlignItems.BASELINE};
`;

export const StyledHeaderRow = styled(Flex)`
  color: ${({ theme }) => theme.color.text.light};
  font-size: 40px;
  justify-content: ${JustifyContent.SPACE_BETWEEN};
  height: ${HEADER_HEIGHT}px;
  width: 100%;
`;

export const StyledNavigationArrows = styled(Flex)`
  padding-left: 20px;
`;

export const StyledNavigationGroup = styled(Flex)`
  align-items: baseline;
  justify-content: space-between;
  margin-right: 20px;
`;

export const StyledRightGroup = styled(Flex)``;

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
