import { type Dispatch, type Ref, type SetStateAction } from "react";
import { type Priority } from "@core/constants/core.constants";
import {
  type Categories_Event,
  type Direction_Migrate,
  type Schema_Event,
} from "@core/types/event.types";
import { type GridEventDraft } from "@web/events/event-draft.types";

// Still used by SomedayEventForm, which remains on the legacy Schema_Event
// draft shape (out of scope for the grid forms' GridEventDraft conversion).
export interface FormProps {
  event: Schema_Event;
  category: Categories_Event;
  isDraft: boolean;
  isExistingEvent: boolean;
  onClose: () => void;
  onCloseEventForm?: () => void;
  onConvert?: () => void;
  onDelete: () => void;
  onDuplicate?: (event: Schema_Event) => void;
  onMigrate?: (
    event: Schema_Event,
    category: Categories_Event,
    direction: Direction_Migrate,
  ) => void;
  onSubmit: (event: Schema_Event | null) => void;
  onSubmitEventForm?: (event: Schema_Event) => void;
  priority?: Priority;
  setEvent: (event: SetStateAction<Schema_Event | null>) => void;
  titleInputRef?: Ref<HTMLInputElement>;
}

// EventForm's props: the grid draft forms (Day + Week) both converge on the
// canonical GridEventDraft. Does not include onMigrate/onSubmitEventForm —
// those are Someday-only concerns EventForm never used.
export interface GridEventFormProps {
  draft: GridEventDraft;
  category: Categories_Event;
  isDraft: boolean;
  isExistingEvent: boolean;
  onClose: () => void;
  onConvert?: () => void;
  onDelete: () => void;
  onDuplicate?: (draft: GridEventDraft) => void;
  onSubmit: (draft: GridEventDraft | null) => void;
  priority?: Priority;
  setDraft: Dispatch<SetStateAction<GridEventDraft | null>>;
  titleInputRef?: Ref<HTMLInputElement>;
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
