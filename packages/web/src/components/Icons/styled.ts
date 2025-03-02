import { css } from "styled-components";
import { IconProps } from "@phosphor-icons/react";

export const iconStyles = css<IconProps>`
  transition: filter 0.2s ease;

  &:hover {
    filter: brightness(130%);
  }
`;
