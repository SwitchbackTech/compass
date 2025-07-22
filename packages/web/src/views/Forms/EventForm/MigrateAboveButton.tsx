import React from "react";
import styled from "styled-components";
import { ArrowUp } from "@phosphor-icons/react";
import { getMetaKey } from "@web/common/utils/shortcut.util";
import { Text } from "@web/components/Text";
import MenuItem from "../ActionsMenu/MenuItem";

const StyledArrowUp = styled(ArrowUp)`
  width: 16px;
  height: 16px;
`;

interface Props {
  onClick: () => void;
  tooltipText?: string;
}

export const MigrateAboveButton: React.FC<Props> = ({
  onClick,
  tooltipText = "Migrate Above",
}) => {
  return (
    <MenuItem
      role="menuitem"
      onClick={onClick}
      aria-label={tooltipText}
      tooltipContent={
        <Text size="s" style={{ display: "flex", alignItems: "center" }}>
          CTRL + {getMetaKey()} + <StyledArrowUp />
        </Text>
      }
    >
      <ArrowUp size={16} />
      <span>{tooltipText}</span>
    </MenuItem>
  );
};
