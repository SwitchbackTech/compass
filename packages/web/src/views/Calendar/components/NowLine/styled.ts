import styled from "styled-components";
import { ColorNames } from "@web/common/types/styles";
import { getColor } from "@web/common/utils/colors";
import { linearGradient } from "@web/common/styles/colors";

export interface StyledNowLineProps {
  width: number;
  top: number;
}

export const StyledNowLine = styled.div<StyledNowLineProps>`
  /* the old, solid now line approach: 
  border-color: ${() => getColor(ColorNames.TEAL_2)}; 
  border-style: solid; 
  border-width: 2px 0 0; 
  */
  background: ${linearGradient};
  height: 1px;
  position: absolute;
  top: ${({ top }) => top}%;
  width: ${({ width }) => width}%;
  z-index: 1;
`;
