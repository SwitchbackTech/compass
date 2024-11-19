import { css } from "styled-components";
import { IconProps } from "@phosphor-icons/react";

interface Props extends IconProps {
  isFocused: boolean;
}

export const iconStyles = css<Props>`
  color: ${({ theme, isFocused }) =>
    isFocused ? theme.color.text.light : theme.color.text.lightInactive};
  transition: filter 0.2s ease;

  &:hover {
    filter: brightness(130%);
  }
`;
