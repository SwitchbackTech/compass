import { ArrowLeftIcon } from "@phosphor-icons/react";
import type React from "react";
import MenuItem from "@web/views/Forms/ActionsMenu/MenuItem";

interface Props {
  onClick: () => void;
  label?: string;
  bgColor: string;
}

export const MoveToSidebarMenuButton: React.FC<Props> = ({
  onClick,
  label = "Move To Sidebar",
  bgColor,
}) => {
  return (
    <MenuItem
      bgColor={bgColor}
      onClick={onClick}
      aria-label={label}
      tooltip={["Control", "Meta", "ArrowLeft"]}
    >
      <ArrowLeftIcon size={14} />
      <span>{label}</span>
    </MenuItem>
  );
};
