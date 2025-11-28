import React from "react";
import styled from "styled-components";
import { ArrowLeft } from "@phosphor-icons/react";
import { getModifierKeyIcon } from "@web/common/utils/shortcut/shortcut.util";
import { Text } from "@web/components/Text";
import MenuItem from "@web/views/Forms/ActionsMenu/MenuItem";

interface Props {
  onClick: () => void;
  label?: string;
  bgColor: string;
}

const StyledArrowLeft = styled(ArrowLeft)`
  width: 15px;
  height: 15px;
`;

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
      tooltipContent={
        <Text size="s" style={{ display: "flex", alignItems: "center" }}>
          CTRL + {getModifierKeyIcon()} + <StyledArrowLeft />
        </Text>
      }
    >
      <ArrowLeft size={16} />
      <span>{label}</span>
    </MenuItem>
  );
};
