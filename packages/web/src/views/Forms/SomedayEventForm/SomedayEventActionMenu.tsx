import React from "react";
import { ActionsMenu } from "../ActionsMenu/ActionsMenu";
import { DeleteButton } from "../EventForm/DeleteButton";
import { DuplicateButton } from "../EventForm/DuplicateButton";
import { MigrateAboveButton } from "../EventForm/MigrateAboveButton";
import { MigrateBackwardButton } from "../EventForm/MigrateBackwardButton";
import { MigrateBelowButton } from "../EventForm/MigrateBelowButton";
import { MigrateForwardButton } from "../EventForm/MigrateForwardButton";

interface Props {
  target: string;
  onMigrateBackwardClick: () => void;
  onMigrateForwardClick: () => void;
  onMigrateBelowClick: () => void;
  onMigrateAboveClick: () => void;
  onDuplicateClick: () => void;
  onDeleteClick: () => void;
}

export const ID_SOMEDAY_EVENT_ACTION_MENU = "someday-event-action-menu";

export const SomedayEventActionMenu: React.FC<Props> = ({
  target,
  onMigrateBackwardClick,
  onMigrateForwardClick,
  onMigrateBelowClick,
  onMigrateAboveClick,
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
          {target === "month" && (
            <MigrateAboveButton
              tooltipText="Migrate to this week"
              onClick={() => {
                onMigrateAboveClick();
                close();
              }}
            />
          )}
          {target === "week" && (
            <MigrateBelowButton
              tooltipText="Migrate to this month"
              onClick={() => {
                onMigrateBelowClick();
                close();
              }}
            />
          )}

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
