import styled from "styled-components";

export interface Props {
  bgColor?: string;
}

export const StyledInput = styled.input<Props>`
  background-color: ${({ bgColor }) => bgColor};
  border: none;
  height: 34px;
  font-size: ${({ theme }) => theme.text.medium};
  outline: none;
  width: 100%;

  ::placeholder {
    color: ${({ theme }) => theme.color.text.darkPlaceholder};
  }

  &:hover {
    filter: brightness(87%);
  }
`;
