import styled from "styled-components";

export const StyledControlsSection = styled.div`
  margin-top: 15px;
  margin-bottom: 10px;
  margin-left: 40px;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.s};
`;
