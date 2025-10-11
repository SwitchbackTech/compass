import styled from "styled-components";

export interface Props {
  bgColor?: string;
}

export const StyledInput = styled.input<Props>`
  background-color: ${({ bgColor }) => bgColor};
  border: none;
  height: 34px;
  padding: 0 8px;
  font-size: ${({ theme }) => theme.text.size.l};
  outline: none;
  width: 100%;
  transition: ${({ theme }) => theme.transition.default};

  ::placeholder {
    color: ${({ theme }) => theme.color.text.darkPlaceholder};
  }

  &:hover {
    background-color: ${({ theme }) => theme.color.border.primary};
  }
`;
