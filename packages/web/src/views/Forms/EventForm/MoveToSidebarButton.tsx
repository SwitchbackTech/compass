import React from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import { getMetaKey } from "@web/common/utils/shortcut.util";
import { Text } from "@web/components/Text";
import TooltipIconButton from "@web/components/TooltipIconButton/TooltipIconButton";

export const MoveToSidebarButton = ({
  onClick,
  tooltipText = "Migrate Backward",
  size = undefined,
}: {
  onClick: () => void;
  tooltipText: string;
  size?: number;
}) => {
  return (
    <TooltipIconButton
      icon={<ArrowLeft id="migrate-backward-button" size={size} />}
      buttonProps={{ "aria-label": tooltipText }}
      tooltipProps={{
        description: tooltipText,
        onClick,
        shortcut: (
          <Text size="s" style={{ display: "flex", alignItems: "center" }}>
            CTRL + {getMetaKey()} + Left
          </Text>
        ),
      }}
    />
  );
};
