import { ArrowUpIcon } from "@phosphor-icons/react";
import type React from "react";
import MenuItem from "@web/views/Forms/ActionsMenu/MenuItem";

interface Props {
  onClick: () => void;
  tooltipText?: string;
}

export const MigrateAboveMenuButton: React.FC<Props> = ({
  onClick,
  tooltipText = "Migrate Above",
}) => {
  return (
    <MenuItem onClick={onClick} aria-label={tooltipText}>
      <ArrowUpIcon size={14} />
      <span>{tooltipText}</span>
    </MenuItem>
  );
};
