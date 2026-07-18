import { Copy } from "@phosphor-icons/react";
import type React from "react";
import MenuItem from "@web/views/Forms/ActionsMenu/MenuItem";

interface Props {
  onClick: () => void;
  label?: string;
}

export const DuplicateMenuButton: React.FC<Props> = ({
  onClick,
  label = "Duplicate Event",
}) => {
  return (
    <MenuItem onClick={onClick} aria-label={label} tooltip={["Mod", "D"]}>
      <Copy size={16} />
      <span>{label}</span>
    </MenuItem>
  );
};
