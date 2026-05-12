import styled from "styled-components";

export const StyledMigrateArrow = styled.button.attrs({ type: "button" })`
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  font: inherit;
  padding-left: 7px;
  padding-right: 7px;

  &:hover {
    border-radius: 50%;
    background: ${({ theme }) => theme.color.bg.primary};
    color: ${({ theme }) => theme.color.text.lighter};
    cursor: pointer;
    padding-right: 7px;
    padding-left: 7px;
    text-align: center;
    transition: background-color 0.4s;
  }

  &:focus-visible {
    border-radius: 50%;
    outline: 2px solid ${({ theme }) => theme.color.text.accent};
    outline-offset: 2px;
  }
`;
export const StyledRecurrenceText = styled.button.attrs({ type: "button" })`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.color.border.primary};
  border-radius: 2px;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-size: 10px;
  opacity: 0;
  transition: opacity 0.2s;
  width: 43px;

  &:hover,
  &:focus-visible {
    opacity: 1;
    transition: border ease-in 0.2s;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.text.accent};
    outline-offset: 2px;
  }
`;
