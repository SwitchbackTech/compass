import React from "react";
import { Trash } from "@phosphor-icons/react";
import IconButton from "@web/components/IconButton/IconButton";

export const DeleteButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <IconButton
      onClick={onClick}
      aria-label="Delete Event [DEL]"
      type="button"
      title="Delete Event [DEL]"
    >
      <Trash />
    </IconButton>
  );
};
