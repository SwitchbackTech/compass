import styled from "styled-components";
import { Command } from "@phosphor-icons/react";

export const StyledCommandIcon = styled(Command)`
  color: ${({ theme }) => theme.color.text.lighter};
  transition: filter 0.2s ease;

  &:hover {
    filter: brightness(130%);
  }
`;
