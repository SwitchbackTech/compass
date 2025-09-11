import styled from "styled-components";
import { colorByPriority } from "@web/common/styles/theme.util";

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

export const MiddleColumn = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

export const Rectangle = styled.div`
  width: 200px;
  height: 120px;
  background-color: #2a2d35;
  border: 2px solid #444;
  border-radius: 8px;
`;

export const RightColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
`;
