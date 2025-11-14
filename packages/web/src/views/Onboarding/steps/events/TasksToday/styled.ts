import styled from "styled-components";

// Styled Components
export const LeftColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const RightColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #23262f;
  padding: 20px;
  width: 350px;
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
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
`;

export const TopContent = styled.div`
  padding: 20px;
  text-align: center;
`;

export const MainContent = styled.div`
  flex: 1;
  background-color: #12151b;
  border: 1px solid #333;
  display: flex;
  margin: 20px;
  gap: 20px;
  max-width: 800px;
  z-index: 5;
`;

export const TasksColumn = styled.div`
  width: 350px;
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

export const DateHeader = styled.h2`
  font-family: "Rubik", sans-serif;
  font-size: 24px;
  color: ${({ theme }) => theme.color.common.white};
  margin: 0 0 2px 0;
`;

export const DateSubheader = styled.p`
  font-family: "Rubik", sans-serif;
  font-size: 16px;
  color: ${({ theme }) => theme.color.text.light};
  margin: 0;
`;

export const TaskInput = styled.input`
  font-family: "Rubik", sans-serif;
  font-size: 14px;
  width: 100%;
  background: ${({ theme }) => theme.color.common.white};
  color: ${({ theme }) => theme.color.common.black};
  border: 2px solid ${({ theme }) => theme.color.text.accent};
  border-radius: 4px;
  padding: 8px 12px;
  box-shadow: 0 0 8px rgba(96, 165, 250, 0.3);

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.color.text.accent};
    box-shadow: 0 0 12px rgba(96, 165, 250, 0.5);
  }

  &::placeholder {
    color: #666;
  }
`;

export const TaskItem = styled.div`
  font-family: "Rubik", sans-serif;
  font-size: 14px;
  background: ${({ theme }) => theme.color.common.white};
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

export const AgendaContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  max-width: 330px;
`;

export const AgendaTimeLabel = styled.div`
  font-family: "Rubik", sans-serif;
  font-size: 12px;
  color: ${({ theme }) => theme.color.text.light};
  padding: 4px 8px;
  border-bottom: 1px solid #333;
`;

export const AgendaEvent = styled.div<{ color?: string }>`
  font-family: "Rubik", sans-serif;
  font-size: 14px;
  background: ${({ color, theme }) => color || theme.color.text.accent};
  color: ${({ theme }) => theme.color.common.white};
  border-radius: 4px;
  padding: 8px 12px;
  margin: 4px 0;
`;
