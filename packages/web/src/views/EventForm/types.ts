import React from "react";
import { Priority } from "@core/core.constants";
import { Schema_Event } from "@core/types/event.types";

export interface BasicProps {
  priority?: Priority;
}

export interface ComponentProps extends BasicProps {
  onClose: () => void;
  onDelete: (eventId: string) => void;
  onSubmit: (event: Schema_Event) => void;
  event: Schema_Event;
  setEvent: React.Dispatch<React.SetStateAction<Schema_Event>>;
}

export interface StyledProps extends BasicProps {
  title?: string;
  isOpen?: boolean;
}
