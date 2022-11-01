import styled from "styled-components";
import { ZIndex } from "@web/common/constants/web.constants";

interface FormContainerProps {
  strategy: "fixed" | "absolute";
  left: number;
  top: number;
}

export const StyledFloatContainer = styled.div<FormContainerProps>`
  position: ${({ strategy }) => strategy || "absolute"};
  left: ${({ left }) => left}px;
  top: ${({ top }) => top}px;
  width: max-content;
  z-index: ${ZIndex.LAYER_3};
`;
