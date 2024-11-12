import styled from "styled-components";
import { X } from "@phosphor-icons/react";

export const StyledXIcon = styled(X)`
  transition: filter 0.2s ease;

  &:hover {
    filter: brightness(150%);
  }
`;
