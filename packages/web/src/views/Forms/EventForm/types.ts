import { SetStateAction } from "react";
import { Priority } from "@core/constants/core.constants";
import {
  Categories_Event,
  Direction_Migrate,
  Schema_Event,
} from "@core/types/event.types";

export interface FormProps {
  event: Schema_Event;
  category: Categories_Event;
  isOpen?: boolean;
  onClose: () => void;
  onCloseEventForm?: () => void;
  onConvert?: () => void;
  onDelete?: (eventId?: string) => void;
  onDuplicate?: (event: Schema_Event) => void;
  onMigrate?: (
    event: Schema_Event,
    category: Categories_Event,
    direction: Direction_Migrate,
  ) => void;
  onSubmit: (event?: Schema_Event) => void;
  onSubmitEventForm?: (event: Schema_Event) => void;
  priority?: Priority;
  setEvent: (event: Schema_Event) => SetStateAction<Schema_Event> | void;
  weekViewRange: {
    startDate: string;
    endDate: string;
  };
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
