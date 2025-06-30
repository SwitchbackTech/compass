import React from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { getMetaKey } from "@web/common/utils/shortcut.util";
import { Text } from "@web/components/Text";
import TooltipIconButton from "@web/components/TooltipIconButton/TooltipIconButton";

export const MigrateForwardButton = ({
  onClick,
  tooltipText = "Migrate Forward",
}: {
  onClick: () => void;
  tooltipText: string;
}) => {
  return (
    <TooltipIconButton
      icon={<ArrowRight />}
      buttonProps={{ "aria-label": tooltipText }}
      tooltipProps={{
        description: tooltipText,
        onClick,
        shortcut: (
          <Text size="s" style={{ display: "flex", alignItems: "center" }}>
            CTRL + {getMetaKey()} + Right
          </Text>
        ),
      }}
    />
  );
};
