import styled from "styled-components";
import { Flex } from "@web/components/Flex";

import { PAGE_MARGIN_TOP, PAGE_MARGIN_X } from "./layout.constants";

export const Styled = styled(Flex)`
  height: 100vh;
  overflow: hidden;
  width: 100vw;
`;

export const StyledCalendar = styled(Flex)`
  background: ${({ theme }) => theme.color.bg.primary};
  flex-grow: 1;
  height: 100%;
  margin: ${PAGE_MARGIN_TOP}px ${PAGE_MARGIN_X}px 0 ${PAGE_MARGIN_X}px;
`;
