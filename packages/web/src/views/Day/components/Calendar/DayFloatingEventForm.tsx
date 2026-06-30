import { type SetStateAction, useCallback } from "react";
import { type Schema_Event } from "@core/types/event.types";
import { FloatingEventForm } from "@web/components/FloatingEventForm/FloatingEventForm";
import { selectDraft } from "@web/ducks/events/selectors/draft.selectors";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { type CalendarEventFormController } from "@web/views/Forms/hooks/useCalendarEventForm";
import { useDeleteEvent } from "@web/views/Forms/hooks/useDeleteEvent";
import { useDuplicateEvent } from "@web/views/Forms/hooks/useDuplicateEvent";
import { useSaveEventForm } from "@web/views/Forms/hooks/useSaveEventForm";

export const DayFloatingEventForm = ({
  controller,
  onClose,
}: {
  controller: CalendarEventFormController;
  onClose: () => void;
}) => {
  const dispatch = useAppDispatch();
  const draft = useAppSelector(selectDraft);
  const isExistingEvent = useAppSelector((state) =>
    draft?._id ? Boolean(selectEventById(state, draft._id)) : false,
  );
  const onSave = useSaveEventForm(onClose);
  const onDelete = useDeleteEvent(draft?._id ?? "", controller.closeForm);
  const onDuplicate = useDuplicateEvent(draft?._id ?? "", controller.openForm);
  const setEvent = useCallback(
    (nextEvent: SetStateAction<Schema_Event | null>) => {
      const resolvedEvent =
        typeof nextEvent === "function" ? nextEvent(draft) : nextEvent;
      dispatch(draftSlice.actions.setEvent(resolvedEvent));
    },
    [dispatch, draft],
  );

  if (!draft) return null;

  return (
    <FloatingEventForm
      controller={controller}
      event={draft}
      isDraft={true}
      isExistingEvent={isExistingEvent}
      onClose={onClose}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onSubmit={onSave}
      setEvent={setEvent}
    />
  );
};
