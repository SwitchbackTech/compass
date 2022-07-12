import styled, { css } from "styled-components";
import { EVENT_WIDTH_MINIMUM } from "@web/common/constants/grid.constants";

interface Props {
  isHovered: boolean;
}

export const StyledTimes = styled.div<Props>`
  transition: box-shadow 0.2s linear;

  ${({ isHovered }) =>
    isHovered &&
    css`
      &:hover {
        box-shadow: 0px 0px 0px 2px black;
      }
    `};
`;

export const StyledTimesPlaceholder = styled.div`
  min-width: ${EVENT_WIDTH_MINIMUM}px;
  min-height: 11px;
  &:hover {
    box-shadow: 0px 0px 0px 2px black;
  }
`;
