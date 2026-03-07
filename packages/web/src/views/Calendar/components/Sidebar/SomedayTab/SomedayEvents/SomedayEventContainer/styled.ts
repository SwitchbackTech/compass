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

export const StyledRecurringWarning = styled.span`
  border: 1px solid transparent;
  border-radius: 2px;
  cursor: not-allowed;
  font-size: 10px;
  opacity: 0.5;
  padding: 2px 4px;

  &:hover {
    opacity: 0.7;
    transition: opacity 0.2s;
  }
`;
