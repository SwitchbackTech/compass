import styled from "styled-components";
import { ZIndex } from "@web/common/constants/web.constants";
import { blueGradient } from "@web/common/styles/theme.util";

interface StyledNowLineProps {
  width: number;
  top: number;
}

export const StyledNowLine = styled.div<StyledNowLineProps>`
  background: ${blueGradient};
  height: 1px;
  position: absolute;
  top: ${({ top }) => top}%;
  width: ${({ width }) => width}%;
  z-index: ${ZIndex.LAYER_2};
`;
