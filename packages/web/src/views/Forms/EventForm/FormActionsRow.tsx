import { Copy, Trash, X } from "@phosphor-icons/react";
import type React from "react";
import { type KeyboardEvent, useState } from "react";
import IconButton from "@web/components/IconButton/IconButton";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

export const EVENT_FORM_ACTIONS_ID = "event-form-actions";

interface Props {
  /** Unsaved create drafts have nothing persisted to copy. */
  isExistingEvent: boolean;
  /**
   * Read-only events can be inspected but not mutated, so Delete is hidden.
   * Duplicate stays: it creates a new, independent event. Close mutates nothing.
   */
  isReadOnly?: boolean;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

type ActionItem = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  shortcut: string | string[];
};

/**
 * Always-visible event-form toolbar above the title. Sits before the title in
 * the DOM so opening the form still lands on the title; Shift+Tab reaches
 * these actions. One tab stop (roving tabindex); Mod+0 jumps here.
 */
export const FormActionsRow: React.FC<Props> = ({
  isExistingEvent,
  isReadOnly = false,
  onClose,
  onDelete,
  onDuplicate,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const items: ActionItem[] = [];
  if (isExistingEvent) {
    items.push({
      icon: <Copy size={18} />,
      label: "Duplicate",
      onClick: onDuplicate,
      shortcut: ["Mod", "D"],
    });
  }
  if (!isReadOnly) {
    items.push({
      icon: <Trash size={18} />,
      label: "Delete",
      onClick: onDelete,
      shortcut: "Delete",
    });
  }
  items.push({
    icon: <X size={18} />,
    label: "Close",
    onClick: onClose,
    shortcut: "Esc",
  });

  // Duplicate appears after a draft saves, so the stored index can go stale.
  const tabbableIndex = Math.min(activeIndex, items.length - 1);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = items.length - 1;
    const move = (index: number) => {
      setActiveIndex(index);
      event.currentTarget
        .querySelectorAll<HTMLButtonElement>("button")
        [index]?.focus();
    };

    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        move(tabbableIndex === last ? 0 : tabbableIndex + 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        move(tabbableIndex === 0 ? last : tabbableIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        move(0);
        break;
      case "End":
        event.preventDefault();
        move(last);
        break;
      default:
        break;
    }
  };

  return (
    <div
      aria-label="Event actions"
      className="flex items-center justify-end gap-1"
      id={EVENT_FORM_ACTIONS_ID}
      onKeyDown={onKeyDown}
      role="toolbar"
    >
      {items.map((item, index) => (
        <TooltipWrapper
          key={item.label}
          description={item.label}
          shortcut={item.shortcut}
        >
          <IconButton
            aria-label={item.label}
            onClick={item.onClick}
            onFocus={() => setActiveIndex(index)}
            size="small"
            tabIndex={index === tabbableIndex ? 0 : -1}
          >
            {item.icon}
          </IconButton>
        </TooltipWrapper>
      ))}
    </div>
  );
};
