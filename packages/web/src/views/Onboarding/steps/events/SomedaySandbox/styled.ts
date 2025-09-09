import styled, { css, keyframes } from "styled-components";
import { OnboardingText } from "@web/views/Onboarding/components";

// Keyframes for text wave animation
export const textWave = keyframes`
  0% {
    background: linear-gradient(90deg, #ffffff 0%, #ffffff 100%);
    background-size: 300% 100%;
    background-position: 0% 0%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  30% {
    background: linear-gradient(90deg, #ffffff 0%, #60a5fa 30%, #ffffff 100%);
    background-size: 300% 100%;
    background-position: 30% 0%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  70% {
    background: linear-gradient(90deg, #ffffff 0%, #60a5fa 70%, #ffffff 100%);
    background-size: 300% 100%;
    background-position: 70% 0%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  100% {
    background: linear-gradient(90deg, #ffffff 0%, #ffffff 100%);
    background-size: 300% 100%;
    background-position: 100% 0%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

// Styled Components
export const LeftColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: default;
  accent-color: ${({ theme }) => theme.color.text.accent};
  pointer-events: none;

  &:not(:checked) {
    accent-color: ${({ theme }) => theme.color.fg.primary};
  }
`;

export const CheckboxLabel = styled.label`
  font-family: "VT323", monospace;
  font-size: 24px;
  color: ${({ theme }) => theme.color.common.white};
  cursor: pointer;
`;

export const BottomContent = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
`;

export const MainContent = styled.div`
  flex: 1;
  background-color: #12151b;
  border: 1px solid #333;
  display: flex;
  margin: 20px;
  gap: 20px;
  z-index: 5;
`;

export const Sidebar = styled.div`
  width: 300px;
  background-color: #23262f;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 20px;
`;

export const SidebarSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const SectionTitle = styled.h3`
  font-family: "Rubik", sans-serif;
  font-size: 18px;
  color: ${({ theme }) => theme.color.common.white};
  margin: 0 0 8px 0;
`;

export const TaskInput = styled.input`
  font-family: "Rubik", sans-serif;
  font-size: 14px;
  width: 100%;
  background: ${({ theme }) => theme.color.common.white};
  color: ${({ theme }) => theme.color.common.black};
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 12px;

  &::placeholder {
    color: #666;
  }
`;

export const TaskItem = styled.div<{ color: string }>`
  font-family: "Rubik", sans-serif;
  font-size: 14px;
  background: ${({ color }) => color};
  color: ${({ theme }) => theme.color.common.black};
  border-radius: 4px;
  padding: 8px 12px;
  width: 100%;
`;

export const Divider = styled.hr`
  border: none;
  border-top: 1px solid #333;
  margin: 0;
`;

export const AnimatedText = styled(OnboardingText)<{ isAnimating: boolean }>`
  ${({ isAnimating }) =>
    isAnimating &&
    css`
      background: linear-gradient(90deg, #ffffff 0%, #60a5fa 50%, #ffffff 100%);
      background-size: 300% 100%;
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: ${textWave} 3s ease-in-out;
    `}
`;
