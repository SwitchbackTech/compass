import { type Dispatch, type FC, type SetStateAction } from "react";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { draftActions } from "@web/events/stores/draft.store";
import { EventForm } from "@web/views/Forms/EventForm/EventForm";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";

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

  if (!isFormOpen || !draft) return null;

  const setFormDraft: Dispatch<SetStateAction<GridEventDraft | null>> = (
    nextDraft,
  ) => {
    const resolvedDraft =
      typeof nextDraft === "function" ? nextDraft(draft) : nextDraft;

    draftActions.setGridDraft(resolvedDraft);
    setDraft(resolvedDraft);
  };

  return (
    <EventForm
      draft={draft}
      isDraft={draft.kind === "create"}
      isExistingEvent={draft.kind === "edit"}
      onClose={discard}
      onDelete={onDelete}
      onDuplicate={duplicateEvent}
      onSubmit={(nextDraft) => {
        if (nextDraft) void onSubmit(nextDraft);
      }}
      setDraft={setFormDraft}
    />
  );
};
