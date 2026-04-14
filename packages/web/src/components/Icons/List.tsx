import { List } from "@phosphor-icons/react";
import styled from "styled-components";

export const StyledListIcon = styled(List)`
  color: ${({ theme }) => theme.color.text.light};
  transition: filter 0.2s ease;

  &:hover {
    cursor: pointer;
    filter: brightness(130%);
  }
`;
