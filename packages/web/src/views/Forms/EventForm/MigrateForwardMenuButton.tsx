import React from "react";
import styled from "styled-components";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { getMetaKeyIcon } from "@web/common/utils/shortcut/shortcut.util";
import { Text } from "@web/components/Text";
import MenuItem from "@web/views/Forms/ActionsMenu/MenuItem";

const StyledArrowRight = styled(ArrowRightIcon)`
  width: 14px;
  height: 14px;
`;

interface Props {
  onClick: () => void;
  tooltipText?: string;
  bgColor: string;
}

export const MigrateForwardMenuButton: React.FC<Props> = ({
  onClick,
  tooltipText = "Migrate Forward",
  bgColor,
}) => {
  return (
    <MenuItem
      onClick={onClick}
      aria-label={tooltipText}
      bgColor={bgColor}
      tooltipContent={
        <Text size="s" style={{ display: "flex", alignItems: "center" }}>
          CTRL + {getMetaKeyIcon({ size: 14 })} + <StyledArrowRight />
        </Text>
      }
    >
      <ArrowRightIcon size={14} />
      <span>{tooltipText}</span>
    </MenuItem>
  );
};
