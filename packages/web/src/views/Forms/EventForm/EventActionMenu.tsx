import type React from "react";
import { ActionsMenu } from "../ActionsMenu/ActionsMenu";
import { DeleteMenuButton } from "./DeleteMenuButton";
import { DuplicateMenuButton } from "./DuplicateMenuButton";

interface Props {
  isExistingEvent: boolean;
  /**
   * Read-only events (unwritable calendar or busy content, packet 08 step
   * 8) can be inspected but never mutated - Delete is an entry point to a
   * real mutation, so it is hidden here the same way ContextMenuItems.tsx
   * hides its Delete item. Duplicate stays: it always creates a new,
   * independent event.
   */
  isReadOnly?: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const EventActionMenu: React.FC<Props> = ({
  isExistingEvent,
  isReadOnly = false,
  onDuplicate,
  onDelete,
}) => {
  return (
    <ActionsMenu>
      {(close) => (
        <>
          {!isExistingEvent ? null : (
            <DuplicateMenuButton
              onClick={() => {
                onDuplicate();
                close();
              }}
            />
          )}
          {!isReadOnly && (
            <DeleteMenuButton
              onClick={() => {
                onDelete();
                close();
              }}
            />
          )}
        </>
      )}
    </ActionsMenu>
  );
};
