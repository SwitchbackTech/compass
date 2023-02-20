import styled, { css } from "styled-components";
import { EVENT_WIDTH_MINIMUM } from "@web/views/Calendar/layout.constants";

interface Props {
  revealBox: boolean;
}

export const StyledTimes = styled.div<Props>`
  ${({ revealBox }) =>
    revealBox &&
    css`
      transition: box-shadow 0.25s linear;
      &:hover {
        box-shadow: 0px 0px 0px 2px black;
      }
    `};
`;

export const StyledTimesPlaceholder = styled.div`
  min-width: ${EVENT_WIDTH_MINIMUM}px;
  min-height: 10px;
`;
