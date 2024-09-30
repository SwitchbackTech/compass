import styled, { css } from "styled-components";
import { MonthCalendarIcon, TrashIcon } from "@web/assets/svg";

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

export const StyledMonthCalendarIcon = styled(MonthCalendarIcon)`
  ${(props: SvgStylesProps) => svgStyles(props)}
`;

export const StyledTrashIcon = styled(TrashIcon)`
  ${(props: SvgStylesProps) => svgStyles(props)}
`;
