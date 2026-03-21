import type React from "react";
import { ArrowUpIcon } from "@phosphor-icons/react";
import MenuItem from "@web/views/Forms/ActionsMenu/MenuItem";
import { MigrationShortcutHint } from "./MigrationShortcutHint";

interface Props {
  onClick: () => void;
  tooltipText?: string;
  bgColor: string;
}

export const MigrateAboveMenuButton: React.FC<Props> = ({
  onClick,
  tooltipText = "Migrate Above",
  bgColor,
}) => {
  return (
    <MenuItem
      onClick={onClick}
      aria-label={tooltipText}
      bgColor={bgColor}
      tooltipContent={
        <MigrationShortcutHint>
          <ArrowUpIcon className="h-3.5 w-3.5" />
        </MigrationShortcutHint>
      }
    >
      <ArrowUpIcon size={14} />
      <span>{tooltipText}</span>
    </MenuItem>
  );
};
