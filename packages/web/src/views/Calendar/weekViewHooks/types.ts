import React from "react";

import { Schema_Event } from "@core/types/event.types";

export interface WeekViewHelpersProps {
  eventsGridRef: React.RefObject<HTMLDivElement>;
  eventState: EventState | null;
  editingEvent: GridEventEntity | null;

  setEventState: React.Dispatch<React.SetStateAction<EventState | null>>;
  setEditingEvent: React.Dispatch<React.SetStateAction<GridEventEntity | null>>;
  setModifiableDateField: React.Dispatch<
    React.SetStateAction<"startDate" | "endDate">
  >;
  onSubmitEvent: (event: Schema_Event | GridEventEntity) => void;
}

export interface EventState {
  name: "rescaling" | "dragging";
  initialMinutesDifference?: number;
  initialYOffset?: number;
  hasMoved?: boolean;
}

export interface GridEventEntity extends Schema_Event {
  isOpen?: boolean;
  isEditing?: boolean;
  importanceIndex?: number;
  siblingsCount?: number;
}
