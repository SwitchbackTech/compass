import { css } from "styled-components";

interface SvgStylesProps {
  color?: string;
  hovercolor?: string;
}

const svgStyles = ({ color, hovercolor }: SvgStylesProps) => {
  return css`
    &path {
      fill: ${color || "white"};
    }

    &:hover path {
      stroke: ${hovercolor || "white"};
      transition: stroke 0.2s;
    }
  `;
};
