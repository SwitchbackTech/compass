import { ArrowDownIcon } from "@phosphor-icons/react";
import MenuItem from "@web/views/Forms/ActionsMenu/MenuItem";
import type React from "react";
import { MigrationShortcutHint } from "./MigrationShortcutHint";

interface Props {
  onClick: () => void;
  tooltipText?: string;
  bgColor: string;
}

export const MigrateBelowMenuButton: React.FC<Props> = ({
  onClick,
  tooltipText = "Migrate Below",
  bgColor,
}) => {
  return (
    <MenuItem
      onClick={onClick}
      aria-label={tooltipText}
      bgColor={bgColor}
      tooltipContent={
        <MigrationShortcutHint>
          <ArrowDownIcon className="h-3.5 w-3.5" />
        </MigrationShortcutHint>
      }
    >
      <ArrowDownIcon size={14} />
      <span>{tooltipText}</span>
    </MenuItem>
  );
};
