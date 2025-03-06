import { SetStateAction } from "react";
import { Priority } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";

export interface FormProps {
  event: Schema_Event;
  isOpen?: boolean;
  onClose: () => void;
  onCloseEventForm?: () => void;
  onConvert?: () => void;
  onDelete?: (eventId?: string) => void;
  onSubmit: (event?: Schema_Event) => void;
  onSubmitEventForm?: (event: Schema_Event) => void;
  priority?: Priority;
  setEvent: (event: Schema_Event) => SetStateAction<Schema_Event> | void;
}

type EventField =
  | "title"
  | "description"
  | "startDate"
  | "endDate"
  | "priority";
export type SetEventFormField = (
  field: Partial<Schema_Event>,
  value?: Schema_Event[EventField],
) => void;

export interface StyledFormProps {
  isOpen?: boolean;
  priority?: Priority;
  title?: string;
}
