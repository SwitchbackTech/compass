import React from "react";
import { Trash } from "@phosphor-icons/react";
import TooltipIconButton from "@web/components/TooltipIconButton/TooltipIconButton";

export const DeleteButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <TooltipIconButton
      icon={<Trash />}
      buttonProps={{ "aria-label": "Delete Event [DEL]" }}
      tooltipProps={{
        shortcut: "DEL",
        description: "Delete Event",
        onClick,
      }}
    />
  );
};
