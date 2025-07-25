import React from "react";
import { Trash } from "@phosphor-icons/react";
import MenuItem from "../ActionsMenu/MenuItem";

interface Props {
  onClick: () => void;
}

export const DeleteMenuButton: React.FC<Props> = ({ onClick }) => {
  return (
    <MenuItem
      role="menuitem"
      onClick={onClick}
      aria-label="Delete Event"
      tooltipContent={<span>DEL</span>}
    >
      <Trash size={16} />
      <span>Delete</span>
    </MenuItem>
  );
};
