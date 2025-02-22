import styled from "styled-components";
import { getGradient } from "@web/common/styles/theme.util";
import { Props } from "./types";

export const StyledDivider = styled.div<Props>`
  background: ${({ color }) => getGradient(color)};
  height: 2px;
  width: ${({ toggled, width }) => (toggled ? width || "100%" : 0)};
  transition: ${({ theme }) => theme.transition.default};
`;
