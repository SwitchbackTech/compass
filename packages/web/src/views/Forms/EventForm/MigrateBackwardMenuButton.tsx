import type React from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import MenuItem from "@web/views/Forms/ActionsMenu/MenuItem";
import { MigrationShortcutHint } from "./MigrationShortcutHint";

interface Props {
  onClick: () => void;
  tooltipText?: string;
  bgColor: string;
}

export const MigrateBackwardMenuButton: React.FC<Props> = ({
  onClick,
  tooltipText = "Migrate Backward",
  bgColor,
}) => {
  return (
    <MenuItem
      onClick={onClick}
      aria-label={tooltipText}
      bgColor={bgColor}
      tooltipContent={
        <MigrationShortcutHint>
          <ArrowLeftIcon className="h-3.5 w-3.5" />
        </MigrationShortcutHint>
      }
    >
      <ArrowLeftIcon size={14} />
      <span>{tooltipText}</span>
    </MenuItem>
  );
};
