import React from "react";
import { Copy } from "@phosphor-icons/react";
import TooltipIconButton from "@web/components/TooltipIconButton/TooltipIconButton";

export const DuplicateButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <TooltipIconButton
      icon={<Copy />}
      buttonProps={{ "aria-label": "Duplicate Event [Meta+D]" }}
      tooltipProps={{
        shortcut: "Meta+D",
        description: "Duplicate Event",
        onClick,
      }}
    />
  );
};
