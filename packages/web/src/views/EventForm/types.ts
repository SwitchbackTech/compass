import React from "react";

import { Priorities } from "@core/core.constants";
import { Schema_Event } from "@core/types/event.types";

export interface BasicProps {
  priority?: Priorities;
}

export interface ComponentProps extends BasicProps {
  onClose: () => void;
  onSubmit: (event: Schema_Event) => void;
  event?: Schema_Event;
  setEvent: React.Dispatch<React.SetStateAction<Schema_Event>>;
}

export interface StyledProps extends BasicProps {
  isOpen?: boolean;
}
