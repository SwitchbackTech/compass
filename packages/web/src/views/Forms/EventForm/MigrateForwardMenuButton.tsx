import React from "react";
import styled from "styled-components";
import { ArrowRight } from "@phosphor-icons/react";
import { getMetaKey } from "@web/common/utils/shortcut.util";
import { Text } from "@web/components/Text";
import MenuItem from "../ActionsMenu/MenuItem";

const StyledArrowRight = styled(ArrowRight)`
  width: 16px;
  height: 16px;
`;

interface Props {
  onClick: () => void;
  tooltipText?: string;
}

export const MigrateForwardMenuButton: React.FC<Props> = ({
  onClick,
  tooltipText = "Migrate Forward",
}) => {
  return (
    <MenuItem
      role="menuitem"
      onClick={onClick}
      aria-label={tooltipText}
      tooltipContent={
        <Text size="s" style={{ display: "flex", alignItems: "center" }}>
          CTRL + {getMetaKey()} + <StyledArrowRight />
        </Text>
      }
    >
      <ArrowRight size={16} />
      <span>{tooltipText}</span>
    </MenuItem>
  );
};
