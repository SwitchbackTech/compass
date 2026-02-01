import styled from "styled-components";
import { Btn } from "@web/components/Button/styled";
import { Flex } from "@web/components/Flex";

export const StyledLogoutBtn = styled(Btn)`
  background: ${({ theme }) => theme.color.status.info};
  height: 35px;
  min-width: 158px;
  padding: 0 8px;

  &:hover {
    filter: brightness(120%);
    transition: brightness 0.5s;
  }
`;

export const StyledLogoutContainer = styled(Flex)`
  bottom: 0;
  justify-content: center;
  left: 0;
  min-height: 100vh;
  position: fixed;
  right: 0;
  text-align: center;
  top: 0;
`;
