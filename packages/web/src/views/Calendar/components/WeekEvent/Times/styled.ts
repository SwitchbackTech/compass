import styled, { css } from "styled-components";

interface Props {
  isHovered: boolean;
}

export const StyledTimes = styled.div<Props>`
  transition: box-shadow 0.2s linear;

  ${(props) =>
    props.isHovered &&
    css`
      &:hover {
        box-shadow: 0px 0px 0px 2px black;
      }
    `}
`;
