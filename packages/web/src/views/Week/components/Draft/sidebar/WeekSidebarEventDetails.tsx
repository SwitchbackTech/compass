import { type FC } from "react";
import { EventForm } from "@web/views/Forms/EventForm/EventForm";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";

/**
 * The Week view's event-details panel, docked in the planner sidebar. Wired
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
      setDraft={setDraft}
    />
  );
};
