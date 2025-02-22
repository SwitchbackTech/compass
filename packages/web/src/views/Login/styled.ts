import styled, { keyframes } from "styled-components";
import { Flex } from "@web/components/Flex";
import { darkBlueGradient } from "../../common/styles/theme.util";

const bgAnimation = keyframes`
  0% {
    background-position-x: 0;
  }
  100% {
    background-position-x: 10000px;
  }
`;

export const StyledLoginContainer = styled.div`
  background: linear-gradient(
    to right,
    ${darkBlueGradient.level1},
    ${darkBlueGradient.level2},
    ${darkBlueGradient.level3},
    ${darkBlueGradient.level4},
    ${darkBlueGradient.level5}
  );
  background-size: 10000px 100%;
  animation: ${bgAnimation} 10s ease infinite;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const StyledLogin = styled(Flex)`
  bottom: 0;
  justify-content: center;
  left: 0;
  min-height: 100vh;
  position: fixed;
  right: 0;
  text-align: center;
  top: 0;
`;

export const Card = styled.div`
  box-shadow: 0 4px 8px ${({ theme }) => theme.color.panel.shadow};
  background: ${({ theme }) => theme.color.bg.secondary};
  border-radius: 35px;
  width: 100%;
  max-width: 577px;
  padding: 2.5rem;
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 8px 16px ${({ theme }) => theme.color.panel.shadow};
  }
`;

export const CardHeader = styled.div`
  text-align: center;
  margin-bottom: 6.5rem;
`;

export const Title = styled.h2`
  font-size: 2.5rem;
  font-weight: bold;
  color: ${({ theme }) => theme.color.text.lighter};
  margin-bottom: 1rem;
`;

export const Subtitle = styled.p`
  color: ${({ theme }) => theme.color.text.lighter};
  font-size: 1.25rem;
  font-style: italic;
  margin-bottom: 2.25rem;
`;

export const Description = styled.p`
  color: ${({ theme }) => theme.color.text.lighter};
  font-size: 1rem;
  margin-bottom: 1rem;
  text-align: center;
`;

export const SignInButtonWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 2.625rem 1rem;
`;
