import styled from "styled-components";
import { ColorNames } from "@web/common/types/styles";
import { getColor } from "@web/common/utils/colors";

export interface StyledNowLineProps {
  width: number;
  top: number;
}

export const StyledNowLine = styled.div<StyledNowLineProps>`
  border-color: ${() => getColor(ColorNames.TEAL_2)};
  border-style: solid;
  border-width: 2px 0 0;
  position: absolute;
  top: ${({ top }) => top}%;
  width: ${({ width }) => width}%;
  z-index: 1;
`;
