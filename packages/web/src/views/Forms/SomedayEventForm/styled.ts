import styled from "styled-components";
import { ZIndex } from "@web/common/constants/web.constants";
import { SIDEBAR_OPEN_WIDTH } from "@web/views/Calendar/layout.constants";

export const OldStyledFormContainer = styled.div`
  position: fixed;
  left: ${SIDEBAR_OPEN_WIDTH}px;
  z-index: ${ZIndex.LAYER_3};
`;

interface FormContainerProps {
  strategy: "fixed" | "absolute";
  left: number;
  top: number;
}

export const StyledFloatContainer = styled.div<FormContainerProps>`
  position: ${({ strategy }) => strategy || "absolute"};
  /* left: ${SIDEBAR_OPEN_WIDTH}px; */
  left: ${({ left }) => left}px;
  top: ${({ top }) => top}px;
  width: max-content;
  z-index: ${ZIndex.LAYER_3};
`;
