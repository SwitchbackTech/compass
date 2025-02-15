import styled from "styled-components";
import { darkBlueGradient } from "@web/common/styles/theme.util";

export const StyledNotFoundImg = styled.img`
  border-radius: 50%;
  border: ${({ theme }) => `4px solid ${theme.color.bg.primary}`};
  box-shadow: ${({ theme }) => `0 0 10px ${theme.color.shadow.default}`};
  max-width: 100%;
`;

export const StyledNotFoundContainer = styled.div`
  align-items: center;
  background: linear-gradient(
    to right,
    ${darkBlueGradient.level1},
    ${darkBlueGradient.level2},
    ${darkBlueGradient.level3},
    ${darkBlueGradient.level4},
    ${darkBlueGradient.level5}
  );
  color: ${({ theme }) => theme.color.text.lighter};
  display: flex;
  flex-direction: column;
  height: 100vh;
  justify-content: center;
  width: 100vw;
`;

export const StyledBackButton = styled.button`
  background: ${({ theme }) => theme.color.fg.primaryDark};
  border: ${({ theme }) => `2px solid ${theme.color.border.primary}`};
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  color: ${({ theme }) => theme.color.text.lighter};
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  padding: 8px 16px;
  margin-bottom: 20px;
  margin-top: 20px;
  transition: all 0.2s ease-in-out;

  &:hover {
    filter: brightness(120%);
  }
`;
