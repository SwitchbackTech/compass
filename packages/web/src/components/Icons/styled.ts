import { type IconProps } from "@phosphor-icons/react";
import { css } from "styled-components";

export const iconStyles = css<IconProps>`
  transition: filter 0.2s ease;

  &:hover {
    filter: brightness(130%);
  }
`;
