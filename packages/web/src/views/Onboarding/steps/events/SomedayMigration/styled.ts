import styled from "styled-components";

export const MainContent = styled.div`
  flex: 1;
  background-color: #12151b;
  border: 1px solid #333;
  display: flex;
  margin: 20px;
  gap: 20px;
  z-index: 5;
  position: relative;
  overflow: visible;
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

export const SectionTitle = styled.h4.withConfig({
  shouldForwardProp: (prop) => prop !== "ref",
})`
  font-family: "Rubik", sans-serif;
  font-size: 18px;
  color: ${({ theme }) => theme.color.common.white};
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const SectionTitleText = styled.span`
  flex: 1;
`;

export const SectionNavigationArrows = styled.div`
  display: flex;
  gap: 8px;
`;

export const SectionNavigationArrow = styled.button<{ disabled?: boolean }>`
  background: none;
  border: 1px solid ${({ theme }) => theme.color.border.primary};
  color: ${({ theme }) => theme.color.common.white};
  font-size: 14px;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  transition: all 0.2s ease;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.bg.secondary};
    transform: scale(1.05);
  }

  &:active:not(:disabled) {
    background: ${({ theme }) => theme.color.bg.primary};
    transform: scale(0.95);
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

export const EventList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const EventItem = styled.div<{ color: string }>`
  font-family: "Rubik", sans-serif;
  font-size: 14px;
  background: ${({ color }) => color};
  color: ${({ theme }) => theme.color.common.black};
  border-radius: 4px;
  padding: 12px;
  width: 100%;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-between;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.color.text.accent};
    outline-offset: 2px;
  }
`;

export const EventText = styled.span`
  flex: 1;
`;

export const EventArrows = styled.div`
  display: flex;
  gap: 4px;
`;

export const MigrateArrow = styled.span<{ disabled?: boolean }>`
  padding: 4px 8px;
  font-size: 12px;
  font-weight: bold;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  border-radius: 3px;
  transition: all 0.2s ease;
  user-select: none;
  opacity: ${({ disabled }) => (disabled ? 0.3 : 1)};

  &:hover {
    background: ${({ disabled }) => (disabled ? "none" : "rgba(0, 0, 0, 0.1)")};
    transform: ${({ disabled }) => (disabled ? "none" : "scale(1.1)")};
  }

  &:active {
    background: ${({ disabled }) => (disabled ? "none" : "rgba(0, 0, 0, 0.2)")};
    transform: ${({ disabled }) => (disabled ? "none" : "scale(0.95)")};
  }
`;

export const MiddleColumn = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

export const MonthPicker = styled.div`
  width: 280px;
  height: 200px;
  background-color: #2a2d3a;
  border: 2px solid #444;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  position: relative;
`;

export const MonthHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

export const MonthTitle = styled.h3`
  font-family: "Rubik", sans-serif;
  font-size: 16px;
  color: ${({ theme }) => theme.color.common.white};
  margin: 0;
`;

export const WeekDays = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== "isCurrentWeek",
})<{ isCurrentWeek: boolean }>`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
  background-color: ${({ isCurrentWeek }) =>
    isCurrentWeek ? "#3a3d44" : "transparent"};
  border-radius: 8px;
  padding: 2px;
`;

export const WeekDayLabel = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== "isCurrentWeek",
})<{ isCurrentWeek: boolean }>`
  font-family: "Rubik", sans-serif;
  font-size: 12px;
  color: #888;
  font-weight: 400;
  text-align: center;
  padding: 4px;
`;

export const CalendarGrid = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== "ref",
})<{ isCurrentWeek: boolean }>`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  flex: 1;
  background-color: ${({ isCurrentWeek }) =>
    isCurrentWeek ? "#3a3d44" : "transparent"};
  border-radius: 8px;
  padding: 8px;
`;

export const CalendarDay = styled.div.withConfig({
  shouldForwardProp: (prop) =>
    !["isCurrentWeek", "isToday"].includes(prop as string),
})<{
  isCurrentWeek: boolean;
  isToday: boolean;
}>`
  font-family: "Rubik", sans-serif;
  font-size: 12px;
  color: ${({ isCurrentWeek, theme }) => {
    if (isCurrentWeek) return theme.color.common.white;
    return "#888";
  }};
  background-color: ${({ isCurrentWeek }) => {
    if (isCurrentWeek) return "#3a3d44"; // Give current week days their own background
    return "transparent";
  }};
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: ${({ isCurrentWeek }) => (isCurrentWeek ? "600" : "400")};

  &:hover {
    background-color: ${({ isCurrentWeek }) => {
      if (isCurrentWeek) return "#4a4d54";
      return "#2a2d35";
    }};
  }
`;

export const RightColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
`;

export const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
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
