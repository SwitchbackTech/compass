import { Priorities } from "@core/constants/core.constants";
import { colorByPriority } from "@web/common/styles/theme.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import IconButton from "@web/components/IconButton/IconButton";
import { Trash, PenNib } from "@phosphor-icons/react";
import React, { useState } from "react";
import {
  MenuItem,
  MenuItemLabel,
  PriorityCircle,
  PriorityContainer,
} from "./styled";
import { useDraftContext } from "@web/views/Calendar/components/Draft/context/useDraftContext";
import { assembleGridEvent } from "@web/common/utils/event.util";

export interface ContextMenuAction {
  id: string;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}

interface ContextMenuItemsProps {
  event: Schema_GridEvent;
  close: () => void;
}

export function ContextMenuItems({ event, close }: ContextMenuItemsProps) {
  const { actions, setters } = useDraftContext();
  const { openForm, deleteEvent, submit } = actions;
  const { setDraft } = setters;

  const [selectedPriority, setSelectedPriority] = useState(event.priority);

  const priorities = [
    {
      id: "work",
      value: Priorities.WORK,
      color: colorByPriority[Priorities.WORK],
    },
    {
      id: "self",
      value: Priorities.SELF,
      color: colorByPriority[Priorities.SELF],
    },
    {
      id: "relations",
      value: Priorities.RELATIONS,
      color: colorByPriority[Priorities.RELATIONS],
    },
  ];

  const handleEditPriority = (priority: Priorities) => {
    setSelectedPriority(priority);
    submit({ ...event, priority });
    close();
  };

  const handleEdit = () => {
    setDraft(assembleGridEvent(event));
    openForm();
    close();
  };

  const menuActions: ContextMenuAction[] = [
    {
      id: "edit",
      label: "Edit",
      onClick: handleEdit,
      icon: (
        <IconButton>
          <PenNib />
        </IconButton>
      ),
    },
    {
      id: "delete",
      label: "Delete",
      onClick: deleteEvent,
      icon: (
        <IconButton>
          <Trash />
        </IconButton>
      ),
    },
  ];

  return (
    <>
      <PriorityContainer>
        {priorities.map((priority) => (
          <PriorityCircle
            key={priority.id}
            color={priority.color}
            selected={selectedPriority === priority.value}
            onClick={() => handleEditPriority(priority.value)}
          />
        ))}
      </PriorityContainer>
      {menuActions.map((item) => (
        <MenuItem
          key={item.id}
          onClick={() => {
            item.onClick();
          }}
        >
          {item.icon}
          <MenuItemLabel>{item.label}</MenuItemLabel>
        </MenuItem>
      ))}
    </>
  );
}
