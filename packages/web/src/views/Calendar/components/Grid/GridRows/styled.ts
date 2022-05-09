import styled from "styled-components";
import { Flex } from "@web/components/Flex";
import { gridDividerBorder } from "@web/views/Calendar/styled";
import { CALENDAR_GRID_MARGIN_LEFT } from "@web/views/Calendar/calendar.constants";

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
export const StyledGridRows = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  left: 35px;
`;
