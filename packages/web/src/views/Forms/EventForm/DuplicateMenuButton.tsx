import { Copy } from "@phosphor-icons/react";
import type React from "react";
import MenuItem from "@web/views/Forms/ActionsMenu/MenuItem";

interface Props {
  onClick: () => void;
  label?: string;
  bgColor: string;
}

export const DuplicateMenuButton: React.FC<Props> = ({
  onClick,
  bgColor,
  label = "Duplicate Event",
}) => {
  return (
    <MenuItem
      onClick={onClick}
      aria-label={label}
      bgColor={bgColor}
      tooltip={["Mod", "D"]}
    >
      <Copy size={16} />
      <span>{label}</span>
    </MenuItem>
  );
};
