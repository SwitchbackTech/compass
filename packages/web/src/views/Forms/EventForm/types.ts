import { SetStateAction } from "react";
import { Priority } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";

export interface FormProps {
  event: Schema_Event;
  isOpen?: boolean;
  onClose: () => void;
  onCloseEventForm?: () => void;
  onConvert: () => void;
  onDelete?: (eventId?: string) => void;
  onSubmit: (event?: Schema_Event) => void;
  onSubmitEventForm?: (event: Schema_Event) => void;
  priority?: Priority;
  setEvent: (event: Schema_Event) => SetStateAction<Schema_Event> | void;
}

export type SetEventFormField = <FieldName extends keyof Schema_Event>(
  field: FieldName,
  value: Schema_Event[FieldName]
) => void;

export interface StyledFormProps {
  isOpen?: boolean;
  priority?: string;
  title?: string;
}
