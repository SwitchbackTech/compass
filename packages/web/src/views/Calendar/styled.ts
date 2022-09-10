import styled from "styled-components";
import { ColorNames } from "@core/constants/colors";
import { getColor } from "@core/util/color.utils";
import { Flex } from "@web/components/Flex";

import { PAGE_TOP_PADDING, PAGE_X_PADDING } from "./layout.constants";

export const Styled = styled(Flex)`
  height: 100vh;
  overflow: hidden;
  width: 100vw;
`;

export const StyledCalendar = styled(Flex)`
  flex-grow: 1;
  height: 100%;
  background: ${getColor(ColorNames.DARK_2)};
  padding: ${PAGE_TOP_PADDING}px ${PAGE_X_PADDING}px 0 ${PAGE_X_PADDING}px;
`;
