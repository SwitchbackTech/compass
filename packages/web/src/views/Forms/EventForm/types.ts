import { type Dispatch, type Ref, type SetStateAction } from "react";
import { type CompassEvent } from "@core/types/compass-event.contracts";
import { type Categories_Event } from "@web/common/types/web.event.types";
import { type GridEventDraft } from "@web/events/event-draft.types";

// EventForm's props: the grid draft forms (Day + Week) both converge on the
// canonical GridEventDraft.
export interface GridEventFormProps {
  draft: GridEventDraft;
  category: Categories_Event;
  isDraft: boolean;
  isExistingEvent: boolean;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate?: (draft: GridEventDraft) => void;
  onSubmit: (draft: GridEventDraft | null) => void;
  setDraft: Dispatch<SetStateAction<GridEventDraft | null>>;
  titleInputRef?: Ref<HTMLInputElement>;
}

type EventField = "title" | "description" | "startDate" | "endDate";
export type SetEventFormField = (
  field: Partial<CompassEvent>,
  value?: CompassEvent[EventField],
) => void;
