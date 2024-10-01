import styled from "styled-components";
import { Repeat } from "@phosphor-icons/react";

export const RepeatIcon = styled(Repeat)`
  transition: filter 0.2s ease;

  &:hover {
    filter: brightness(130%);
  }
`;
