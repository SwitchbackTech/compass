import styled from "styled-components";

export const SelectContent = styled.span<{ dimmed?: boolean }>`
  align-items: center;
  color: ${({ dimmed, theme }) =>
    dimmed ? theme.color.text.darkPlaceholder : theme.color.text.dark};
  display: inline-flex;
  gap: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.text.size.m};
`;
