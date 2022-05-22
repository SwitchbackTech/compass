import styled from "styled-components";
import { ColorNames } from "@web/common/types/styles";
import { EVENT_WIDTH_MINIMUM } from "@web/common/constants/grid.constants";
import { Flex } from "@web/components/Flex";
import { getColor } from "@web/common/utils/colors";
import { Text } from "@web/components/Text";
import {
  HEADER_HEIGHT,
  GRID_MARGIN_LEFT,
  WEEK_DAYS_MARGIN_Y,
} from "@web/views/Calendar/layout.constants";

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
    margin-right: 12px;
  }
`;

export const StyledHeaderFlex = styled(Flex)`
  font-size: 40px;
  margin-left: ${GRID_MARGIN_LEFT}px;
  height: ${HEADER_HEIGHT}px;
`;

export const StyledNavigationButtons = styled(Flex)`
  margin-left: 40px;
`;

export const StyledWeekDaysFlex = styled(Flex)`
  width: calc(100% - ${GRID_MARGIN_LEFT}px);
  margin: ${WEEK_DAYS_MARGIN_Y}px 0 0 0;
  margin-left: ${GRID_MARGIN_LEFT}px;
`;

interface WeekDayFlexProps {
  color: string;
  // width: number;
}

export const StyledWeekDayFlex = styled(Flex)<WeekDayFlexProps>`
  color: ${({ color }) => color};
  flex-basis: 100%;
  min-width: ${EVENT_WIDTH_MINIMUM}px;
`;
