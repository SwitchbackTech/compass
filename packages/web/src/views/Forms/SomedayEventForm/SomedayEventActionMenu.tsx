import React from "react";
import { Priority } from "@core/constants/core.constants";
import { ID_SOMEDAY_EVENT_ACTION_MENU } from "@web/common/constants/web.constants";
import { ActionsMenu } from "../ActionsMenu/ActionsMenu";
import { DeleteMenuButton } from "../EventForm/DeleteMenuButton";
import { DuplicateMenuButton } from "../EventForm/DuplicateMenuButton";
import { MigrateAboveMenuButton } from "../EventForm/MigrateAboveMenuButton";
import { MigrateBackwardMenuButton } from "../EventForm/MigrateBackwardMenuButton";
import { MigrateBelowMenuButton } from "../EventForm/MigrateBelowMenuButton";
import { MigrateForwardMenuButton } from "../EventForm/MigrateForwardMenuButton";

interface Props {
  target: string;
  onMigrateBackwardClick: () => void;
  onMigrateForwardClick: () => void;
  onMigrateBelowClick: () => void;
  onMigrateAboveClick: () => void;
  onDuplicateClick: () => void;
  onDeleteClick: () => void;
  priority: Priority;
}

export const SomedayEventActionMenu: React.FC<Props> = ({
  target,
  onMigrateBackwardClick,
  onMigrateForwardClick,
  onMigrateBelowClick,
  onMigrateAboveClick,
  onDuplicateClick,
  onDeleteClick,
  priority,
}) => {
  return (
    <ActionsMenu id={ID_SOMEDAY_EVENT_ACTION_MENU} priority={priority}>
      {(close) => (
        <>
          <MigrateBackwardMenuButton
            tooltipText={`Migrate to previous ${target}`}
            onClick={() => {
              onMigrateBackwardClick();
              close();
            }}
          />
          <MigrateForwardMenuButton
            tooltipText={`Migrate to next ${target}`}
            onClick={() => {
              onMigrateForwardClick();
              close();
            }}
          />
          {target === "month" && (
            <MigrateAboveMenuButton
              tooltipText="Migrate to this week"
              onClick={() => {
                onMigrateAboveClick();
                close();
              }}
            />
          )}
          {target === "week" && (
            <MigrateBelowMenuButton
              tooltipText="Migrate to this month"
              onClick={() => {
                onMigrateBelowClick();
                close();
              }}
            />
          )}

          <DuplicateMenuButton
            onClick={() => {
              onDuplicateClick();
              close();
            }}
          />
          <DeleteMenuButton
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
