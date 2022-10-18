import styled from "styled-components";
import { ZIndex } from "@web/common/constants/web.constants";
import { linearGradient } from "@core/constants/colors";

interface StyledNowLineProps {
  width: number;
  top: number;
}

export const StyledNowLine = styled.div<StyledNowLineProps>`
  background: ${linearGradient};
  height: 1px;
  position: absolute;
  top: ${({ top }) => top}%;
  width: ${({ width }) => width}%;
  z-index: ${ZIndex.LAYER_2};
`;
