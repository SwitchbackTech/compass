import React from "react";

import { Priorities } from "@core/core.constants";
import { Schema_Event_Wip } from "@core/types/event.types";

export interface BasicProps {
  priority?: Priorities;
}

export interface ComponentProps extends BasicProps {
  onClose: () => void;
  onSubmit: (event: Schema_Event_Wip) => void;
  event?: Schema_Event_Wip;
  setEvent: React.Dispatch<React.SetStateAction<Schema_Event_Wip>>;
}

export interface StyledProps extends BasicProps {
  isOpen?: boolean;
}
