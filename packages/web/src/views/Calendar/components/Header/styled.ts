import styled from "styled-components";
import { Flex } from "@web/components/Flex";

// Constants
export const GRID_MARGIN_LEFT = 60;
export const WEEK_DAYS_MARGIN_Y = 10;
export const EVENT_WIDTH_MINIMUM = 100;

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
