import React from "react";
import { ActionsMenu } from "../ActionsMenu/ActionsMenu";
import { DeleteMenuButton } from "./DeleteMenuButton";
import { DuplicateMenuButton } from "./DuplicateMenuButton";
import { MoveToSidebarMenuButton } from "./MoveToSidebarMenuButton";

interface Props {
  isDraft: boolean;
  onConvert?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const ID_EVENT_ACTION_MENU = "event-action-menu";

export const EventActionMenu: React.FC<Props> = ({
  isDraft,
  onConvert,
  onDuplicate,
  onDelete,
}) => {
  return (
    <ActionsMenu id={ID_EVENT_ACTION_MENU}>
      {(close) => (
        <>
          {!isDraft && (
            <MoveToSidebarMenuButton
              onClick={() => {
                onConvert?.();
                close();
              }}
            />
          )}
          <DuplicateMenuButton
            onClick={() => {
              onDuplicate();
              close();
            }}
          />
          <DeleteMenuButton
            onClick={() => {
              onDelete();
              close();
            }}
          />
        </>
      )}
    </ActionsMenu>
  );
};
