import type React from "react";
import { ActionsMenu } from "../ActionsMenu/ActionsMenu";
import { DeleteMenuButton } from "./DeleteMenuButton";
import { DuplicateMenuButton } from "./DuplicateMenuButton";
import { MoveToSidebarMenuButton } from "./MoveToSidebarMenuButton";

interface Props {
  bgColor: string;
  isDraft: boolean;
  isExistingEvent: boolean;
  /**
   * Read-only events (unwritable calendar or busy content, packet 08 step
   * 8) can be inspected but never mutated - Convert and Delete are entry
   * points to real mutations (a schedule change, a deletion), so both are
   * hidden here the same way ContextMenuItems.tsx hides its Delete item.
   * Duplicate stays: it always creates a new, independent event.
   */
  isReadOnly?: boolean;
  onConvert?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const EventActionMenu: React.FC<Props> = ({
  bgColor,
  isDraft,
  isExistingEvent,
  isReadOnly = false,
  onConvert,
  onDuplicate,
  onDelete,
}) => {
  return (
    <ActionsMenu bgColor={bgColor}>
      {(close) => (
        <>
          {!isDraft && !isReadOnly && (
            <MoveToSidebarMenuButton
              onClick={() => {
                onConvert?.();
                close();
              }}
              bgColor={bgColor}
            />
          )}
          {!isExistingEvent ? null : (
            <DuplicateMenuButton
              bgColor={bgColor}
              onClick={() => {
                onDuplicate();
                close();
              }}
            />
          )}
          {!isReadOnly && (
            <DeleteMenuButton
              bgColor={bgColor}
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
