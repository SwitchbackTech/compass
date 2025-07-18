import React from "react";
import { ActionsMenu } from "../ActionsMenu/ActionsMenu";
import { DeleteButton } from "./DeleteButton";
import { DuplicateButton } from "./DuplicateButton";
import { MoveToSidebarButton } from "./MoveToSidebarButton";

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
            <MoveToSidebarButton
              onClick={() => {
                onConvert?.();
                close();
              }}
            />
          )}
          <DuplicateButton
            onClick={() => {
              onDuplicate();
              close();
            }}
          />
          <DeleteButton
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
