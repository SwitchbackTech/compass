import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { Priorities } from "@core/constants/core.constants";
import { ContextMenuPosition } from "./GridContextMenuWrapper";

interface ContextMenuProps {
  position: ContextMenuPosition | null;
  onClose: () => void;
}

const MenuWrapper = styled.ul<{ position: ContextMenuPosition | null }>`
  position: absolute;
  top: ${({ position }) => position?.y || 0}px;
  left: ${({ position }) => position?.x || 0}px;
  background-color: white;
  border: 1px solid #ccc;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  padding: 5px 0;
  list-style: none;
  z-index: 1000;
  min-width: 160px;
`;

const PriorityContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  padding: 10px;
`;

const PriorityCircle = styled.div<{ color: string; selected: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid ${({ color }) => color};
  background-color: ${({ selected, color }) =>
    selected ? color : "transparent"};
  cursor: pointer;
  transition: all 0.2s ease-in-out;
`;

const MenuItem = styled.li`
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

const ContextMenu = ({ position, onClose }: ContextMenuProps) => {
  const menuRef = useRef<HTMLUListElement>(null);
  const [selectedPriority, setSelectedPriority] = useState(
    Priorities.UNASSIGNED
  );

  // TODO: Use colors from constant
  const priorities = [
    { id: "work", value: Priorities.WORK, color: "rgb(200, 236, 249)" },
    { id: "self", value: Priorities.SELF, color: "rgb(149, 189, 219)" },
    {
      id: "relations",
      value: Priorities.RELATIONS,
      color: "rgb(134, 208, 187)",
    },
  ];

  const actions = [
    { id: "edit", label: "✏️ Edit", onClick: () => alert("Edit clicked") },
    {
      id: "delete",
      label: "🗑️ Delete",
      onClick: () => alert("Delete clicked"),
    },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <MenuWrapper ref={menuRef} position={position}>
      <PriorityContainer>
        {priorities.map((priority) => (
          <PriorityCircle
            key={priority.id}
            color={priority.color}
            selected={selectedPriority === priority.value}
            onClick={() => setSelectedPriority(priority.value)}
          />
        ))}
      </PriorityContainer>
      {actions.map((item) => (
        <MenuItem
          key={item.id}
          onClick={() => {
            item.onClick();
            onClose();
          }}
        >
          {item.label}
        </MenuItem>
      ))}
    </MenuWrapper>
  );
};

export default ContextMenu;
