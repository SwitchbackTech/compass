import styled from "styled-components";
import { Z_INDEX_FLOATING_FORM } from "@web/common/constants/web.constants";

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
  z-index: ${Z_INDEX_FLOATING_FORM};
`;
