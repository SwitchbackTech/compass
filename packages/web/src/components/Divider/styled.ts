import styled from "styled-components";
import { getColor } from "@core/util/color.utils";
import { linearGradient } from "@web/common/styles/theme.util";

import { Props } from "./types";

export const Styled = styled.div<Props>`
  background: ${({ colorName, color }) =>
    color || (colorName ? getColor(colorName) : linearGradient)};
  height: 2px;
  width: ${({ toggled, width }) => (toggled ? width || "100%" : 0)};
  transition: ${({ theme }) => theme.transition.default};
`;
