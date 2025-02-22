import styled from "styled-components";
import { Btn } from "@web/components/Button/styled";

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
