import styled, { css } from "styled-components";

interface Props {
  isHovered: boolean;
}

export const StyledTimes = styled.div<Props>`
  /* transform: translate(0%); */
  /* transition: 0.3s ease-out; */

  ${(props) =>
    props.isHovered &&
    css`
      &:hover {
        border: 2px solid;
        position: fixed;
        transform: translate(0%, -3%);
        transition: 0.1s ease-in;
      }
    `}
`;
