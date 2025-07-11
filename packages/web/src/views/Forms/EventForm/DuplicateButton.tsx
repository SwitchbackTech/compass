import React from "react";
import { Copy } from "@phosphor-icons/react";
import { getMetaKey } from "@web/common/utils/shortcut.util";
import { Text } from "@web/components/Text";
import TooltipIconButton from "@web/components/TooltipIconButton/TooltipIconButton";

export const DuplicateButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <TooltipIconButton
      icon={<Copy />}
      buttonProps={{ "aria-label": "Duplicate Event [Meta+D]" }}
      tooltipProps={{
        shortcut: (
          <Text size="s" style={{ display: "flex", alignItems: "center" }}>
            {getMetaKey()} + D
          </Text>
        ),
        description: "Duplicate Event",
        onClick,
      }}
    />
  );
};
