import styled, { keyframes } from "styled-components";
import { Btn } from "@web/components/Button/styled";
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

export const WaitlistBtn = styled(Btn)`
  background: ${({ theme }) => theme.color.status.info};
  color: ${({ theme }) => theme.color.text.dark};
  padding: 0.5rem 1rem;
  margin-top: 1rem;
  &:hover {
    filter: brightness(120%);
  }
`;

export const NavLinkContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  margin: 1.5rem 0;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

export const StyledNavLink = styled.a`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: ${({ theme }) => theme.color.status.info};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.text.weight.medium};
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  width: 100%;

  &:hover,
  &:focus {
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-2px);
    text-decoration: none;
  }

  &:active {
    transform: translateY(0);
  }
`;

export const NavLinkIcon = styled.span`
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const NavLinkText = styled.span`
  font-size: 1rem;
`;

export const InfoText = styled.p`
  color: ${({ theme }) =>
    theme.color.text.lightInactive}; /* Mapped from c.gray200 */
  font-size: 1rem;
  text-align: center;
  margin-top: 0.5rem;
  margin-bottom: 1.5rem;
  line-height: 1.5;
`;

export const EmailFormContainer = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 1.5rem;
`;

export const EmailInputField = styled.input`
  width: 100%;
  padding: 0.8rem 1rem;
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  border: 1px solid ${({ theme }) => theme.color.border.primary}; /* Was gray700, using border.primary (c.gray800) */
  background-color: ${({ theme }) =>
    theme.color.bg
      .secondary}; /* Was darkBlue300, using bg.secondary (c.darkBlue200) */
  color: ${({ theme }) =>
    theme.color.text.lighter}; /* Was white100, mapped from c.white100 */
  font-size: 1rem;
  box-sizing: border-box;

  &::placeholder {
    color: ${({ theme }) =>
      theme.color.text
        .darkPlaceholder}; /* Was gray400, mapped from c.gray300 */
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) =>
      theme.color.text.accent}; /* Was blue200, using text.accent (c.blue100) */
    box-shadow: 0 0 0 3px ${({ theme }) => `${theme.color.text.accent}4D`}; /* Was blue100 for shadow base, using text.accent (c.blue100) */
  }
`;

export const ActionButton = styled.button`
  background-color: ${({ theme }) =>
    theme.color.status.info}; /* Was blue200, using status.info (c.blue100) */
  color: ${({ theme }) =>
    theme.color.text
      .dark}; /* Was white100, using general dark text for contrast on blue100 */
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  font-size: 1rem;
  font-weight: ${({ theme }) => theme.text.weight.medium};
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.1s ease;
  width: 100%;
  box-sizing: border-box;

  &:hover {
    background-color: ${({ theme }) =>
      theme.color.text
        .accent}; /* Was blue300, using text.accent (c.blue100) for hover, assuming it's visually distinct or can be adjusted later */
  }

  &:active {
    transform: translateY(1px);
  }

  &:disabled {
    background-color: ${({ theme }) =>
      theme.color.border
        .primaryDark}; /* Was gray500, using border.primaryDark (c.gray900) */
    color: ${({ theme }) =>
      theme.color.text
        .darkPlaceholder}; /* Was gray300, mapped from c.gray300 */
    cursor: not-allowed;
  }
`;

export const TertiaryButton = styled.a`
  display: inline-block;
  background-color: transparent;
  color: ${({ theme }) =>
    theme.color.text.accent}; /* Was blue200, using text.accent (c.blue100) */
  padding: 0.8rem 1.5rem;
  border: 1px solid ${({ theme }) => theme.color.text.accent}; /* Was blue200, using text.accent (c.blue100) */
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  font-size: 1rem;
  font-weight: ${({ theme }) => theme.text.weight.medium};
  cursor: pointer;
  text-decoration: none;
  text-align: center;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
  width: 100%;
  max-width: 400px;
  box-sizing: border-box;

  &:hover {
    background-color: ${({ theme }) =>
      `${theme.color.text.accent}20`}; /* Was blue200 for base, using text.accent (c.blue100) */
    color: ${({ theme }) =>
      theme.color.text.accent}; /* Was blue100, using text.accent (c.blue100) */
  }
`;
