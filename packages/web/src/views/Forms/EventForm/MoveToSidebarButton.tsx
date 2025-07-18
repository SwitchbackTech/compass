import React from "react";
import styled from "styled-components";
import { ArrowLeft } from "@phosphor-icons/react";
import { getMetaKey } from "@web/common/utils/shortcut.util";
import { Text } from "@web/components/Text";
import MenuItem from "../ActionsMenu/MenuItem";

interface Props {
  onClick: () => void;
  label?: string;
}

const StyledArrowLeft = styled(ArrowLeft)`
  width: 15px;
  height: 15px;
`;

export const MoveToSidebarButton: React.FC<Props> = ({
  onClick,
  label = "Move To Sidebar",
}) => {
  return (
    <MenuItem
      role="menuitem"
      onClick={onClick}
      aria-label={label}
      tooltipContent={
        <Text size="s" style={{ display: "flex", alignItems: "center" }}>
          CTRL + {getMetaKey()} + <StyledArrowLeft />
        </Text>
      }
    >
      <ArrowLeft size={16} />
      <span>{label}</span>
    </MenuItem>
  );
};
