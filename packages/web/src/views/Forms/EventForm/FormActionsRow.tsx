import { Copy, Trash, X } from "@phosphor-icons/react";
import type React from "react";
import { type KeyboardEvent, useState } from "react";
import IconButton from "@web/components/IconButton/IconButton";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

export const EVENT_FORM_ACTIONS_ID = "event-form-actions";

interface Props {
  /**
   * Duplicate only makes sense once there is something to copy; an unsaved
   * create draft has no persisted event behind it. Same gate the old kebab
   * menu applied.
   */
  isExistingEvent: boolean;
  /**
   * Read-only events (unwritable calendar or busy content) can be inspected
   * but never mutated, so Delete is hidden the same way ContextMenuItems.tsx
   * hides its Delete item. Duplicate stays: it always creates a new,
   * independent event. Close stays: it mutates nothing.
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
 * The event form's actions, as an always-visible toolbar above the title.
 *
 * This replaced a three-dot menu: with the app keyboard-driven, an action
 * hidden behind a click-to-expand trigger was an action nobody found. Visible
 * icons advertise the capability, their tooltips (shown on hover *and* on
 * keyboard focus) teach the direct shortcut, and `Mod+0` jumps here — the
 * toolbar is `actions`/digit 0 in edit-sequence.fields.ts, so the hold-Mod
 * hint overlay chips it like any field.
 *
 * Deliberately above the title in the DOM: the title keeps focus when the
 * form opens, so the toolbar must sit behind Shift+Tab rather than stealing
 * the first forward Tab from the title the way the old kebab did.
 */
export const FormActionsRow: React.FC<Props> = ({
  isExistingEvent,
  isReadOnly = false,
  onClose,
  onDelete,
  onDuplicate,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const items: ActionItem[] = [
    ...(isExistingEvent
      ? [
          {
            icon: <Copy size={18} />,
            label: "Duplicate",
            onClick: onDuplicate,
            shortcut: ["Mod", "D"],
          },
        ]
      : []),
    ...(isReadOnly
      ? []
      : [
          {
            icon: <Trash size={18} />,
            label: "Delete",
            onClick: onDelete,
            shortcut: "Delete",
          },
        ]),
    {
      icon: <X size={18} />,
      label: "Close",
      onClick: onClose,
      shortcut: "Esc",
    },
  ];

  // Which item is tabbable can change between renders (Duplicate appears once
  // a draft saves), so clamp rather than trusting the stored index.
  const tabbableIndex = Math.min(activeIndex, items.length - 1);

  const focusItem = (index: number) => {
    setActiveIndex(index);
    const buttons = document.querySelectorAll<HTMLButtonElement>(
      `#${EVENT_FORM_ACTIONS_ID} button`,
    );
    buttons[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = items.length - 1;
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        focusItem(tabbableIndex === last ? 0 : tabbableIndex + 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        focusItem(tabbableIndex === 0 ? last : tabbableIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        focusItem(0);
        break;
      case "End":
        event.preventDefault();
        focusItem(last);
        break;
      default:
        break;
    }
  };

  return (
    // Roving tabindex: the toolbar is one tab stop and arrows move within it,
    // so Shift+Tab from the title reaches the actions and one more leaves
    // them, instead of reversing through three separate stops.
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
