import { ArrowRightIcon } from "@phosphor-icons/react";
import type React from "react";
import MenuItem from "@web/views/Forms/ActionsMenu/MenuItem";
import { MigrationShortcutHint } from "./MigrationShortcutHint";

interface Props {
  onClick: () => void;
  tooltipText?: string;
  bgColor: string;
}

export const MigrateForwardMenuButton: React.FC<Props> = ({
  onClick,
  tooltipText = "Migrate Forward",
  bgColor,
}) => {
  return (
    <MenuItem
      onClick={onClick}
      aria-label={tooltipText}
      bgColor={bgColor}
      tooltipContent={
        <MigrationShortcutHint>
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </MigrationShortcutHint>
      }
    >
      <ArrowRightIcon size={14} />
      <span>{tooltipText}</span>
    </MenuItem>
  );
};
