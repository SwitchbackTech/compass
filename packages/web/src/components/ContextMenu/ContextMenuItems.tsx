import React, { useState } from "react";
import { Copy, PenNib, Trash } from "@phosphor-icons/react";
import { Priorities } from "@core/constants/core.constants";
import { ID_CONTEXT_MENU_ITEMS } from "@web/common/constants/web.constants";
import { colorByPriority } from "@web/common/styles/theme.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { assembleGridEvent } from "@web/common/utils/event.util";
import { getSomedayEventCategory } from "@web/common/utils/someday.util";
import IconButton from "@web/components/IconButton/IconButton";
import { useDraftContext } from "@web/views/Calendar/components/Draft/context/useDraftContext";
import { useSidebarContext } from "@web/views/Calendar/components/Draft/sidebar/context/useSidebarContext";
import {
  MenuItem,
  MenuItemLabel,
  PriorityCircle,
  PriorityContainer,
  TooltipText,
  TooltipWrapper,
} from "./styled";

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
  const { openForm, deleteEvent, duplicateEvent, submit } = actions;
  const { setDraft } = setters;

  const sidebarContext = useSidebarContext(true);

  const [selectedPriority, setSelectedPriority] = useState(event.priority);

  const priorities = [
    {
      id: "work",
      value: Priorities.WORK,
      label: "Work",
      color: colorByPriority[Priorities.WORK],
    },
    {
      id: "self",
      value: Priorities.SELF,
      label: "Self",
      color: colorByPriority[Priorities.SELF],
    },
    {
      id: "relations",
      value: Priorities.RELATIONS,
      label: "Relations",
      color: colorByPriority[Priorities.RELATIONS],
    },
  ];

  const handleEditPriority = (priority: Priorities) => {
    setSelectedPriority(priority);
    submit({ ...event, priority });
    close();
  };

  const handleEdit = () => {
    if (!event.isSomeday) {
      setDraft(assembleGridEvent(event));
      openForm();
      close();
    } else {
      const sidebarActions = sidebarContext?.actions;
      if (!sidebarActions) return; // TS Guard
      const category = getSomedayEventCategory(event);
      sidebarActions.onDraft(event, category);
      close();
    }
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
      id: "duplicate",
      label: "Duplicate",
      onClick: duplicateEvent,
      icon: (
        <IconButton>
          <Copy />
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
    <div id={ID_CONTEXT_MENU_ITEMS}>
      <PriorityContainer>
        {priorities.map((priority) => (
          <TooltipWrapper key={priority.id}>
            <PriorityCircle
              color={priority.color}
              selected={selectedPriority === priority.value}
              onClick={() => handleEditPriority(priority.value)}
            />
            <TooltipText>{priority.label}</TooltipText>
          </TooltipWrapper>
        ))}
      </PriorityContainer>
      {menuActions.map((item) => (
        <MenuItem
          key={item.id}
          onClick={() => {
            item.onClick();
            close();
          }}
        >
          {item.icon}
          <MenuItemLabel>{item.label}</MenuItemLabel>
        </MenuItem>
      ))}
    </div>
  );
}
