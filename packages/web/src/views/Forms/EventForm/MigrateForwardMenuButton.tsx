import { ArrowRightIcon } from "@phosphor-icons/react";
import type React from "react";
import MenuItem from "@web/views/Forms/ActionsMenu/MenuItem";

interface Props {
  onClick: () => void;
  tooltipText?: string;
}

export const MigrateForwardMenuButton: React.FC<Props> = ({
  onClick,
  tooltipText = "Migrate Forward",
}) => {
  return (
    <MenuItem onClick={onClick} aria-label={tooltipText}>
      <ArrowRightIcon size={14} />
      <span>{tooltipText}</span>
    </MenuItem>
  );
};
