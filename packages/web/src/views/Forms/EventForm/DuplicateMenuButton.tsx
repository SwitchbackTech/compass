import React from "react";
import { Copy } from "@phosphor-icons/react";
import { getModifierKeyIcon } from "@web/common/utils/shortcut/shortcut.util";
import { Text } from "@web/components/Text";
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
      tooltipContent={
        <Text size="s" style={{ display: "flex", alignItems: "center" }}>
          {getModifierKeyIcon()} + D
        </Text>
      }
    >
      <Copy size={16} />
      <span>{label}</span>
    </MenuItem>
  );
};
