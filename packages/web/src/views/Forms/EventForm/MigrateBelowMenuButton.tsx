import React from "react";
import styled from "styled-components";
import { ArrowDown } from "@phosphor-icons/react";
import { getMetaKey } from "@web/common/utils/shortcut.util";
import { Text } from "@web/components/Text";
import MenuItem from "../ActionsMenu/MenuItem";

const StyledArrowDown = styled(ArrowDown)`
  width: 16px;
  height: 16px;
`;

interface Props {
  onClick: () => void;
  tooltipText?: string;
}

export const MigrateBelowMenuButton: React.FC<Props> = ({
  onClick,
  tooltipText = "Migrate Below",
}) => {
  return (
    <MenuItem
      role="menuitem"
      onClick={onClick}
      aria-label={tooltipText}
      tooltipContent={
        <Text size="s" style={{ display: "flex", alignItems: "center" }}>
          CTRL + {getMetaKey()} + <StyledArrowDown />
        </Text>
      }
    >
      <ArrowDown size={16} />
      <span>{tooltipText}</span>
    </MenuItem>
  );
};
