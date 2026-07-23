import {
  type Dispatch,
  type FC,
  type SetStateAction,
  useCallback,
} from "react";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { draftActions } from "@web/events/stores/draft.store";
import { EventFormPanel } from "@web/views/Forms/EventFormPanel/EventFormPanel";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";

export const syncWeekGridDraft = (
  draft: GridEventDraft | null,
  setDraft: Dispatch<SetStateAction<GridEventDraft | null>>,
) => {
  draftActions.setGridDraft(draft);
  setDraft(draft);
};

/**
 * The Week view's event-details panel, docked in the sidebar. Wired
 * through DraftContext so it keeps Week's save/confirmation pipeline
 * (useDraftConfirmation) intact; the Day view's store-driven equivalent is
 * SidebarEventDetails.
 */
export const WeekSidebarEventDetails: FC = () => {
  const { actions, setters, state, confirmation } = useDraftContext();
  const { discard, duplicateEvent } = actions;
  const { setDraft } = setters;
  const { draft, isFormOpen } = state;
  const { onSubmit, onDelete } = confirmation;

  const syncDraft = useCallback(
    (resolved: GridEventDraft | null) => {
      syncWeekGridDraft(resolved, setDraft);
    },
    [setDraft],
  );

  return (
    <EventFormPanel
      confirmation={{ onDelete, onSubmit }}
      draft={draft}
      isDraft={draft?.kind === "create"}
      isExistingEvent={draft?.kind === "edit"}
      isFormOpen={isFormOpen}
      onClose={discard}
      onDuplicate={duplicateEvent}
      syncDraft={syncDraft}
    />
  );
};
