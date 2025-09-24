import React from "react";
import { Trash } from "@phosphor-icons/react";
import MenuItem from "../ActionsMenu/MenuItem";

interface Props {
  onClick: () => void;
  bgColor: string;
}

export const DeleteMenuButton: React.FC<Props> = ({ onClick, bgColor }) => {
  return (
    <MenuItem
      onClick={onClick}
      aria-label="Delete Event"
      bgColor={bgColor}
      tooltipContent={<span>DEL</span>}
    >
      <Trash size={16} />
      <span>Delete</span>
    </MenuItem>
  );
};
