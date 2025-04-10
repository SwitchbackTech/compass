import React from "react";
import { Trash } from "@phosphor-icons/react";
import IconButton from "@web/components/IconButton/IconButton";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

export const DeleteButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <TooltipWrapper onClick={onClick} shortcut="DEL" description="Delete Event">
      <IconButton aria-label="Delete Event [DEL]" type="button">
        <Trash />
      </IconButton>
    </TooltipWrapper>
  );
};
