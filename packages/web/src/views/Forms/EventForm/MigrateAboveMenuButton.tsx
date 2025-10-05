import React from "react";
import styled from "styled-components";
import { ArrowUp } from "@phosphor-icons/react";
import { getMetaKey } from "@web/common/utils/shortcut/shortcut.util";
import { Text } from "@web/components/Text";
import MenuItem from "../ActionsMenu/MenuItem";

const StyledArrowUp = styled(ArrowUp)`
  width: 16px;
  height: 16px;
`;

interface Props {
  onClick: () => void;
  tooltipText?: string;
  bgColor: string;
}

export const MigrateAboveMenuButton: React.FC<Props> = ({
  onClick,
  tooltipText = "Migrate Above",
  bgColor,
}) => {
  return (
    <MenuItem
      onClick={onClick}
      aria-label={tooltipText}
      bgColor={bgColor}
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
