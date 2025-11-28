import React from "react";
import styled from "styled-components";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { getMetaKeyIcon } from "@web/common/utils/shortcut/shortcut.util";
import { Text } from "@web/components/Text";
import MenuItem from "@web/views/Forms/ActionsMenu/MenuItem";

const StyledArrowLeft = styled(ArrowLeftIcon)`
  width: 14px;
  height: 14px;
`;

interface Props {
  onClick: () => void;
  tooltipText?: string;
  bgColor: string;
}

export const MigrateBackwardMenuButton: React.FC<Props> = ({
  onClick,
  tooltipText = "Migrate Backward",
  bgColor,
}) => {
  return (
    <MenuItem
      onClick={onClick}
      aria-label={tooltipText}
      bgColor={bgColor}
      tooltipContent={
        <Text size="s" style={{ display: "flex", alignItems: "center" }}>
          CTRL + {getMetaKeyIcon({ size: 14 })} + <StyledArrowLeft />
        </Text>
      }
    >
      <ArrowLeftIcon size={14} />
      <span>{tooltipText}</span>
    </MenuItem>
  );
};
