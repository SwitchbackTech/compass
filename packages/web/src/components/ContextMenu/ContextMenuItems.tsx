import React, { useState } from "react";
import { Copy, PenNib, Trash } from "@phosphor-icons/react";
import { Priorities } from "@core/constants/core.constants";
import { ID_CONTEXT_MENU_ITEMS } from "@web/common/constants/web.constants";
import { colorByPriority } from "@web/common/styles/theme.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { assembleGridEvent } from "@web/common/utils/event/event.util";
import { getSomedayEventCategory } from "@web/common/utils/event/someday.event.util";
import {
  MenuItem,
  MenuItemLabel,
  PriorityCircle,
  PriorityContainer,
  TooltipText,
  TooltipWrapper,
} from "@web/components/ContextMenu/styled";
import IconButton from "@web/components/IconButton/IconButton";
import { selectIsEventPending } from "@web/ducks/events/selectors/pending.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useDraftContext } from "@web/views/Calendar/components/Draft/context/useDraftContext";
import { useSidebarContext } from "@web/views/Calendar/components/Draft/sidebar/context/useSidebarContext";

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
  const { actions, setters, confirmation } = useDraftContext();
  const { openForm, duplicateEvent, submit } = actions;
  const { setDraft } = setters;

  const sidebarContext = useSidebarContext(true);
  const isPending = useAppSelector((state) =>
    selectIsEventPending(state, event._id!),
  );

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
    if (isPending) return;
    setSelectedPriority(priority);
    submit({ ...event, priority });
    close();
  };

  const handleEdit = () => {
    if (isPending) return;
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

  const { onDelete } = confirmation;

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
      onClick: onDelete,
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
              style={{
                opacity: isPending ? 0.5 : 1,
                cursor: isPending ? "wait" : "pointer",
              }}
            />
            <TooltipText>{priority.label}</TooltipText>
          </TooltipWrapper>
        ))}
      </PriorityContainer>
      {menuActions.map((item) => (
        <MenuItem
          key={item.id}
          onClick={() => {
            if (
              isPending &&
              (item.id === "edit" ||
                item.id === "duplicate" ||
                item.id === "delete")
            ) {
              return;
            }
            item.onClick();
            close();
          }}
          style={{
            opacity:
              isPending &&
              (item.id === "edit" ||
                item.id === "duplicate" ||
                item.id === "delete")
                ? 0.5
                : 1,
            cursor:
              isPending &&
              (item.id === "edit" ||
                item.id === "duplicate" ||
                item.id === "delete")
                ? "wait"
                : "pointer",
          }}
        >
          {item.icon}
          <MenuItemLabel>{item.label}</MenuItemLabel>
        </MenuItem>
      ))}
    </div>
  );
}
