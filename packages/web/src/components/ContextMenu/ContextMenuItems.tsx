import { Copy, PenNib, Trash } from "@phosphor-icons/react";
import type React from "react";
import { Priorities } from "@core/constants/core.constants";
import { ID_CONTEXT_MENU_ITEMS } from "@web/common/constants/web.constants";
import { colorByPriority } from "@web/common/styles/theme.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
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
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { selectIsEventPending } from "@web/ducks/events/selectors/pending.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";

export interface ContextMenuAction {
  id: string;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}

export interface ContextMenuItemsActions {
  delete: () => void;
  duplicate: () => void;
  edit: () => void;
  editPriority: (priority: Priorities) => void;
}

interface ContextMenuItemsProps {
  event: Schema_GridEvent;
  close: () => void;
}

interface ContextMenuItemsViewProps extends ContextMenuItemsProps {
  actions: ContextMenuItemsActions;
  isPending: boolean;
}

export function ContextMenuItemsView({
  actions,
  close,
  event,
  isPending,
}: ContextMenuItemsViewProps) {
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
    actions.editPriority(priority);
    close();
  };

  const handleEdit = () => {
    if (isPending) return;
    actions.edit();
  };

  const isActionDisabled = (itemId: string) =>
    isPending &&
    (itemId === "edit" || itemId === "duplicate" || itemId === "delete");

  const menuActions: ContextMenuAction[] = [
    {
      id: "edit",
      label: "Edit",
      onClick: handleEdit,
      icon: <PenNib aria-hidden="true" size={20} />,
    },
    {
      id: "duplicate",
      label: "Duplicate",
      onClick: actions.duplicate,
      icon: <Copy aria-hidden="true" size={20} />,
    },
    {
      id: "delete",
      label: "Delete",
      onClick: actions.delete,
      icon: <Trash aria-hidden="true" size={20} />,
    },
  ];

  return (
    <div id={ID_CONTEXT_MENU_ITEMS}>
      <PriorityContainer>
        {priorities.map((priority) => (
          <TooltipWrapper key={priority.id}>
            <PriorityCircle
              aria-label={`Set priority to ${priority.label}`}
              aria-pressed={event.priority === priority.value}
              as="button"
              color={priority.color}
              disabled={isPending}
              selected={event.priority === priority.value}
              type="button"
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
      {menuActions.map((item) => {
        const disabled = isActionDisabled(item.id);
        return (
          <MenuItem
            disabled={disabled}
            key={item.id}
            type="button"
            onClick={() => {
              item.onClick();
              close();
            }}
          >
            {item.icon}
            <MenuItemLabel>{item.label}</MenuItemLabel>
          </MenuItem>
        );
      })}
    </div>
  );
}

export function ContextMenuItems({ event, close }: ContextMenuItemsProps) {
  const { actions, setters, confirmation } = useDraftContext();
  const { openForm, duplicateEvent, submit } = actions;
  const { setDraft } = setters;

  const sidebarContext = useSidebarContext(true);
  const eventId = event._id;
  const isPending = useAppSelector((state) =>
    eventId ? selectIsEventPending(state, eventId) : false,
  );

  const menuActions: ContextMenuItemsActions = {
    delete: confirmation.onDelete,
    duplicate: duplicateEvent,
    edit: () => {
      if (!event.isSomeday) {
        setDraft(assembleGridEvent(event));
        openForm();
        return;
      }

      const sidebarActions = sidebarContext?.actions;
      if (!sidebarActions) return;
      const category = getSomedayEventCategory(event);
      sidebarActions.onDraft(event, category);
    },
    editPriority: (priority) => submit({ ...event, priority }),
  };

  return (
    <ContextMenuItemsView
      actions={menuActions}
      close={close}
      event={event}
      isPending={isPending}
    />
  );
}
