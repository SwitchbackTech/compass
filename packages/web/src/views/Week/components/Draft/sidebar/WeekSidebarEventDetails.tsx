import { type FC } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type Dayjs } from "@core/util/date/dayjs";
import { EventForm } from "@web/views/Forms/EventForm/EventForm";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";

interface Props {
  viewEnd: Dayjs;
  viewStart: Dayjs;
}

/**
 * The Week view's event-details panel, docked in the planner sidebar. Wired
 * through DraftContext so it keeps Week's save/confirmation pipeline
 * (useDraftConfirmation) intact; the Day view's store-driven equivalent is
 * SidebarEventDetails.
 */
export const WeekSidebarEventDetails: FC<Props> = ({ viewEnd, viewStart }) => {
  const { actions, setters, state, confirmation } = useDraftContext();
  const { discard, duplicateEvent } = actions;
  const { setDraft } = setters;
  const { draft, isFormOpen } = state;
  const { onSubmit, onDelete } = confirmation;

  if (!isFormOpen || !draft) return null;

  const onConvert = () => {
    actions.convert(
      viewStart.format(YEAR_MONTH_DAY_FORMAT),
      viewEnd.format(YEAR_MONTH_DAY_FORMAT),
    );
  };

  return (
    <EventForm
      draft={draft}
      isDraft={draft.kind === "create"}
      isExistingEvent={draft.kind === "edit"}
      onClose={discard}
      onConvert={onConvert}
      onDelete={onDelete}
      onDuplicate={duplicateEvent}
      onSubmit={(nextDraft) => {
        if (nextDraft) void onSubmit(nextDraft);
      }}
      setDraft={setDraft}
    />
  );
};
