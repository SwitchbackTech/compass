import React from "react";
import styled from "styled-components";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { getMetaKeyIcon } from "@web/common/utils/shortcut/shortcut.util";
import { Text } from "@web/components/Text";
import MenuItem from "@web/views/Forms/ActionsMenu/MenuItem";

interface Props {
  onClick: () => void;
  label?: string;
  bgColor: string;
}

const StyledArrowLeft = styled(ArrowLeftIcon)`
  width: 14px;
  height: 14px;
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
          CTRL + {getMetaKeyIcon({ size: 14 })} + <StyledArrowLeft />
        </Text>
      }
    >
      <ArrowLeftIcon size={14} />
      <span>{label}</span>
    </MenuItem>
  );
};
