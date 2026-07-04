import { Copy, PenNib, Trash } from "@phosphor-icons/react";
import type React from "react";
import { Priorities } from "@core/constants/core.constants";
import { ID_CONTEXT_MENU_ITEMS } from "@web/common/constants/web.constants";
import { type CSSVariables } from "@web/common/styles/css.types";
import { colorByPriority } from "@web/common/styles/theme.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { assembleGridEvent } from "@web/common/utils/event/event.util";
import { getSomedayEventCategory } from "@web/common/utils/event/someday.event.util";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
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
}

export function ContextMenuItemsView({
  actions,
  close,
  event,
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
    actions.editPriority(priority);
    close();
  };

  const menuActions: ContextMenuAction[] = [
    {
      id: "edit",
      label: "Edit",
      onClick: actions.edit,
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
      <div className="flex justify-center gap-2.5 p-2.5">
        {priorities.map((priority) => (
          <div
            className="group relative flex flex-col items-center"
            key={priority.id}
          >
            <button
              aria-label={`Set priority to ${priority.label}`}
              aria-pressed={event.priority === priority.value}
              className="c-context-priority-circle"
              data-selected={event.priority === priority.value}
              type="button"
              onClick={() => handleEditPriority(priority.value)}
              style={
                {
                  "--priority-color": priority.color,
                  cursor: "pointer",
                } as CSSVariables
              }
            />
            <span className="c-context-tooltip">{priority.label}</span>
          </div>
        ))}
      </div>
      {menuActions.map((item) => (
        <button
          className="c-context-menu-item"
          key={item.id}
          type="button"
          onClick={() => {
            item.onClick();
            close();
          }}
        >
          {item.icon}
          <span className="text-l">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export function ContextMenuItems({ event, close }: ContextMenuItemsProps) {
  const { actions, setters, confirmation } = useDraftContext();
  const { openForm, duplicateEvent, submit } = actions;
  const { setDraft } = setters;

  const sidebarContext = useSidebarContext(true);

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
    <ContextMenuItemsView actions={menuActions} close={close} event={event} />
  );
}
