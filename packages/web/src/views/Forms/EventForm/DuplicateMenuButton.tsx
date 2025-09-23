import React from "react";
import { Copy } from "@phosphor-icons/react";
import { getMetaKey } from "@web/common/utils/shortcut.util";
import { Text } from "@web/components/Text";
import MenuItem from "../ActionsMenu/MenuItem";

interface Props {
  onClick: () => void;
  label?: string;
  bgColor: string;
}

export const DuplicateMenuButton: React.FC<Props> = ({
  onClick,
  bgColor,
  label = "Duplicate",
}) => {
  return (
    <MenuItem
      onClick={onClick}
      aria-label={label}
      bgColor={bgColor}
      tooltipContent={
        <Text size="s" style={{ display: "flex", alignItems: "center" }}>
          {getMetaKey()} + D
        </Text>
      }
    >
      <Copy size={16} />
      <span>Duplicate</span>
    </MenuItem>
  );
};
