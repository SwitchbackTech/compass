import { ArrowDownIcon } from "@phosphor-icons/react";
import type React from "react";
import MenuItem from "@web/views/Forms/ActionsMenu/MenuItem";

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
      tooltip={["Control", "Meta", "ArrowDown"]}
    >
      <ArrowDownIcon size={14} />
      <span>{tooltipText}</span>
    </MenuItem>
  );
};
