import React from "react";
import styled from "styled-components";
import { ArrowUpIcon } from "@phosphor-icons/react";
import { getMetaKeyIcon } from "@web/common/utils/shortcut/shortcut.util";
import { Text } from "@web/components/Text";
import MenuItem from "@web/views/Forms/ActionsMenu/MenuItem";

const StyledArrowUp = styled(ArrowUpIcon)`
  width: 14px;
  height: 14px;
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
          CTRL + {getMetaKeyIcon({ size: 14 })} + <StyledArrowUp />
        </Text>
      }
    >
      <ArrowUpIcon size={14} />
      <span>{tooltipText}</span>
    </MenuItem>
  );
};
