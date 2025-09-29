import React from "react";
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
  bgColor: string;
}

export const SomedayEventActionMenu: React.FC<Props> = ({
  bgColor,
  target,
  onMigrateBackwardClick,
  onMigrateForwardClick,
  onMigrateBelowClick,
  onMigrateAboveClick,
  onDuplicateClick,
  onDeleteClick,
}) => {
  return (
    <ActionsMenu id={ID_SOMEDAY_EVENT_ACTION_MENU} bgColor={bgColor}>
      {(close) => (
        <>
          <MigrateBackwardMenuButton
            bgColor={bgColor}
            tooltipText={`Migrate to previous ${target}`}
            onClick={() => {
              onMigrateBackwardClick();
              close();
            }}
          />
          <MigrateForwardMenuButton
            bgColor={bgColor}
            tooltipText={`Migrate to next ${target}`}
            onClick={() => {
              onMigrateForwardClick();
              close();
            }}
          />
          {target === "month" && (
            <MigrateAboveMenuButton
              bgColor={bgColor}
              tooltipText="Migrate to this week"
              onClick={() => {
                onMigrateAboveClick();
                close();
              }}
            />
          )}
          {target === "week" && (
            <MigrateBelowMenuButton
              bgColor={bgColor}
              tooltipText="Migrate to this month"
              onClick={() => {
                onMigrateBelowClick();
                close();
              }}
            />
          )}

          <DuplicateMenuButton
            bgColor={bgColor}
            onClick={() => {
              onDuplicateClick();
              close();
            }}
          />
          <DeleteMenuButton
            bgColor={bgColor}
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
