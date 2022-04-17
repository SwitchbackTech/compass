import styled, { css } from "styled-components";
import { TrashIcon } from "@web/assets/svg";

interface SvgStylesProps {
  color?: string;
  hoverColor?: string;
}

const svgStyles = ({ color, hoverColor }: SvgStylesProps) => {
  return css`
    &path {
      fill: ${color || "white"};
    }

    &:hover path {
      stroke: ${hoverColor || "white"};
    }
  `;
};

export const StyledTrashIcon = styled(TrashIcon)`
  ${(props: SvgStylesProps) => svgStyles(props)}
`;
