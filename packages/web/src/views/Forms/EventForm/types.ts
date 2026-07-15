import { type Dispatch, type SetStateAction } from "react";
import { type CompassEvent } from "@core/types/compass-event.contracts";
import { type GridEventDraft } from "@web/events/event-draft.types";

// EventForm's props: the grid draft forms (Day + Week) both converge on the
// canonical GridEventDraft.
export interface GridEventFormProps {
  draft: GridEventDraft;
  isDraft: boolean;
  isExistingEvent: boolean;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate?: (draft: GridEventDraft) => void;
  onSubmit: (draft: GridEventDraft | null) => void;
  setDraft: Dispatch<SetStateAction<GridEventDraft | null>>;
}

export type SetEventFormField = (field: Partial<CompassEvent>) => void;
