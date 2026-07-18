import { ArrowLeftIcon } from "@phosphor-icons/react";
import type React from "react";
import MenuItem from "@web/views/Forms/ActionsMenu/MenuItem";

interface Props {
  onClick: () => void;
  tooltipText?: string;
}

export const MigrateBackwardMenuButton: React.FC<Props> = ({
  onClick,
  tooltipText = "Migrate Backward",
}) => {
  return (
    <MenuItem onClick={onClick} aria-label={tooltipText}>
      <ArrowLeftIcon size={14} />
      <span>{tooltipText}</span>
    </MenuItem>
  );
};
