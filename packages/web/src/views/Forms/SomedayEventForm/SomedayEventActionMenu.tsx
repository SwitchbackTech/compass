import React from "react";
import { ActionsMenu } from "../ActionsMenu/ActionsMenu";
import { DeleteButton } from "../EventForm/DeleteButton";
import { DuplicateButton } from "../EventForm/DuplicateButton";
import { MigrateBackwardButton } from "../EventForm/MigrateBackwardButton";
import { MigrateForwardButton } from "../EventForm/MigrateForwardButton";

interface Props {
  target: string;
  onMigrateBackwardClick: () => void;
  onMigrateForwardClick: () => void;
  onDuplicateClick: () => void;
  onDeleteClick: () => void;
}

export const ID_SOMEDAY_EVENT_ACTION_MENU = "someday-event-action-menu";

export const SomedayEventActionMenu: React.FC<Props> = ({
  target,
  onMigrateBackwardClick,
  onMigrateForwardClick,
  onDuplicateClick,
  onDeleteClick,
}) => {
  return (
    <ActionsMenu id={ID_SOMEDAY_EVENT_ACTION_MENU}>
      {(close) => (
        <>
          <MigrateBackwardButton
            tooltipText={`Migrate to previous ${target}`}
            onClick={() => {
              console.log("migrate backward");
              onMigrateBackwardClick();
              close();
            }}
          />
          <MigrateForwardButton
            tooltipText={`Migrate to next ${target}`}
            onClick={() => {
              onMigrateForwardClick();
              close();
            }}
          />
          <DuplicateButton
            onClick={() => {
              onDuplicateClick();
              close();
            }}
          />
          <DeleteButton
            onClick={() => {
              onDeleteClick();
              close();
            }}
          />
        </>
      )}
    </ActionsMenu>
  );
};
