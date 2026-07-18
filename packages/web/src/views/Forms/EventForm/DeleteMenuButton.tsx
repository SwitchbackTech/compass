import { Trash } from "@phosphor-icons/react";
import type React from "react";
import MenuItem from "../ActionsMenu/MenuItem";

interface Props {
  onClick: () => void;
}

export const DeleteMenuButton: React.FC<Props> = ({ onClick }) => {
  return (
    <MenuItem onClick={onClick} aria-label="Delete Event" tooltip="Delete">
      <Trash size={16} />
      <span>Delete</span>
    </MenuItem>
  );
};
