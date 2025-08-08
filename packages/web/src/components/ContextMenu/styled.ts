import styled from "styled-components";

export const PriorityContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  padding: 10px;
`;

export const TooltipWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const TooltipText = styled.span`
  position: absolute;
  bottom: 100%;
  margin-bottom: 6px;
  padding: 4px 8px;
  background-color: #333;
  color: #fff;
  border-radius: 4px;
  white-space: nowrap;
  font-size: 13px;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: translateY(5px);
  transition: all 0.2s ease-in-out;
  z-index: 10;

  ${TooltipWrapper}:hover & {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
`;

export const PriorityCircle = styled.div<{ color: string; selected: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid ${({ color }) => color};
  background-color: ${({ selected, color }) =>
    selected ? color : "transparent"};
  cursor: pointer;
  transition: all 0.2s ease-in-out;
`;

export const MenuItem = styled.li`
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  color: #333;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid #eee;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: #f5f5f5;
  }
`;

export const MenuItemLabel = styled.span`
  font-size: ${({ theme }) => theme.text.size.l};
`;
