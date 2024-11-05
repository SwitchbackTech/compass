import styled from "styled-components";
import { Flex } from "@web/components/Flex";
import { GRID_MARGIN_LEFT } from "@web/views/Calendar/layout.constants";
import { DIVIDER_GRID } from "@web/views/Calendar/layout.constants";

export const StyledGridRow = styled(Flex)`
  height: calc(100% / 11);
  border-bottom: ${({ theme }) =>
    `${DIVIDER_GRID}px solid ${theme.color.gridLine.primary}`};
  width: 100%;
  position: relative;

  & > span {
    position: absolute;
    bottom: -5px;
    left: -${GRID_MARGIN_LEFT}px;
  }
`;
export const StyledGridRows = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  left: 35px;
`;
