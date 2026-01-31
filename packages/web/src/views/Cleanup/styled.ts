import styled from "styled-components";

export const StyledCleanupMessage = styled.div`
  font-size: 1.2rem;
  text-align: center;
  padding: 2rem;
  color: ${({ theme }) => theme.color.text.primary};

  small {
    font-size: 0.9rem;
    color: ${({ theme }) => theme.color.text.secondary};
    margin-top: 1rem;
    display: block;
  }
`;
