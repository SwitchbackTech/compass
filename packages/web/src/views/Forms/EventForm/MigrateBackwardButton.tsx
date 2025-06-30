import React from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import { getMetaKey } from "@web/common/utils/shortcut.util";
import { Text } from "@web/components/Text";
import TooltipIconButton from "@web/components/TooltipIconButton/TooltipIconButton";

export const MigrateBackwardButton = ({
  onClick,
  tooltipText = "Migrate Backward",
}: {
  onClick: () => void;
  tooltipText: string;
}) => {
  return (
    <TooltipIconButton
      icon={<ArrowLeft />}
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
