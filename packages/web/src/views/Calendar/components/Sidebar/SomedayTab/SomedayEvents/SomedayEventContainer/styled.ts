import styled from "styled-components";

export const StyledMigrateArrow = styled.span`
  padding-left: 7px;
  padding-right: 7px;

  &:hover {
    border-radius: 50%;
    background: ${({ theme }) => theme.color.bg.primary};
    color: white;
    cursor: pointer;
    padding-right: 7px;
    padding-left: 7px;
    text-align: center;
    transition: background-color 0.4s;
  }
`;
export const StyledMigrateArrowInForm = styled(StyledMigrateArrow)`
  font-size: 27px;
`;
export const StyledRecurrenceText = styled.span`
  border: 1px solid ${({ theme }) => theme.color.border.primary};
  border-radius: 2px;
  font-size: 10px;
  opacity: 0;
  transition: opacity 0.2s;
  width: 43px;

  &:hover {
    opacity: 1;
    transition: border ease-in 0.2s;
  }
`;
