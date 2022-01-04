import styled from "styled-components";

import { Flex } from "@web/components/Flex";

export const StyledDateTimeFlex = styled(Flex)`
  font-weight: 600;
  margin-top: 20px;
  height: 40px;

  & .select-styled__control {
    width: 150px;
  }
`;

export const StyledDateFlex = styled(Flex)`
  width: 120px;
`;

export const StyledTimeFlex = styled(Flex)`
  margin-left: 85px;
`;
