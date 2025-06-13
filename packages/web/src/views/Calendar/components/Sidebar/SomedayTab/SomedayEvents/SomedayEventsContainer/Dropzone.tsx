import styled from "styled-components";

// DropZone visually indicates the valid droppable area while dragging
export const DropZone = styled.div<{ isActive: boolean }>`
  position: relative;
  transition:
    background-color 0.2s ease,
    border 0.2s ease;
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  border: ${({ isActive, theme }) =>
    isActive
      ? `2px dashed ${theme.color.border.primary}`
      : `2px dashed transparent`};
  background-color: ${({ isActive, theme }) =>
    isActive ? theme.color.bg.secondary : "transparent"};
`;
