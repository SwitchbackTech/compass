import styled from "styled-components";
import { linearGradient } from "@core/constants/colors";
import { ANIMATION_TIME_3_MS } from "@web/common/constants/web.constants";
import { getColor } from "@core/util/color.utils";

import { Props } from "./types";

export const Styled = styled.div<Props>`
  background: ${({ colorName, color }) =>
    color || (colorName ? getColor(colorName) : linearGradient)};
  height: 2px;
  width: ${({ toggled, width }) => (toggled ? width || "100%" : 0)};
  transition: ${({ withAnimation = true }) =>
    withAnimation ? ANIMATION_TIME_3_MS : undefined};
`;
