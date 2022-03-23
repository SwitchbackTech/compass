import React from "react";
import { Schema_Event } from "@core/types/event.types";

export interface WeekViewHelpersProps {
  eventsGridRef: React.RefObject<HTMLDivElement>;
  eventState: State_Event | null;
  editingEvent: Schema_GridEvent | null;

  setEventState: React.Dispatch<React.SetStateAction<State_Event | null>>;
  setEditingEvent: React.Dispatch<
    React.SetStateAction<Schema_GridEvent | null>
  >;
  setModifiableDateField: React.Dispatch<
    React.SetStateAction<"startDate" | "endDate">
  >;
  onSubmitEvent: (event: Schema_Event | Schema_GridEvent) => void;
}

export interface State_Event {
  name: "rescaling" | "dragging";
  initialMinutesDifference?: number;
  initialYOffset?: number;
  hasMoved?: boolean;
}

export interface Schema_GridEvent extends Schema_Event {
  isOpen?: boolean;
  isEditing?: boolean;
  importanceIndex?: number;
  row: number;
  siblingsCount?: number;
}
