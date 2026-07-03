import { FloatingFocusManager, FloatingPortal } from "@floating-ui/react";
import { useCallback } from "react";
import { type Schema_Event } from "@core/types/event.types";
import {
  Z_INDEX_FLOATING_FORM,
  ZIndex,
} from "@web/common/constants/web.constants";
import { useGridMaxZIndex } from "@web/common/hooks/useGridMaxZIndex";
import { useEventById } from "@web/ducks/events/queries/useEventById";
import {
  selectDraft,
  selectIsEventFormOpen,
} from "@web/ducks/events/selectors/draft.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { EventForm } from "@web/views/Forms/EventForm/EventForm";
import { useCloseEventForm } from "@web/views/Forms/hooks/useCloseEventForm";
import { useDeleteEvent } from "@web/views/Forms/hooks/useDeleteEvent";
import { useDuplicateEvent } from "@web/views/Forms/hooks/useDuplicateEvent";
import { type useEventForm } from "@web/views/Forms/hooks/useEventForm";
import { useSaveEventForm } from "@web/views/Forms/hooks/useSaveEventForm";

export function FloatingEventForm({
  form,
}: {
  form: ReturnType<typeof useEventForm>;
}) {
  const dispatch = useAppDispatch();
  const draft = useAppSelector(selectDraft);
  const isFormOpen = useAppSelector(selectIsEventFormOpen);
  const _id = draft?._id;
  const onSave = useSaveEventForm();
  const onDelete = useDeleteEvent(draft?._id as string);
  const onDuplicate = useDuplicateEvent(draft?._id as string);
  const onClose = useCloseEventForm();
  const maxZIndex = useGridMaxZIndex();
  const formZIndex = Math.max(
    maxZIndex + ZIndex.LAYER_1,
    Z_INDEX_FLOATING_FORM,
  );
  const open = isFormOpen && !!draft;
  const existing = Boolean(useEventById(_id));

  const setEvent = useCallback(
    (
      cb:
        | ((event: Schema_Event | null) => Schema_Event | null)
        | Schema_Event
        | null,
    ) => {
      const update = typeof cb === "function" ? cb(draft) : cb;
      dispatch(draftSlice.actions.setEvent(update));
    },
    [dispatch, draft],
  );

  if (!open) return null;

  return (
    <FloatingPortal>
      <FloatingFocusManager
        context={form.context}
        // Must stay false: this form hosts nested floating trees (e.g.
        // ActionsMenu) with their own focus managers, so the default
        // close-on-blur here would close the form while focus is still
        // moving within a child menu's separate floating tree.
        closeOnFocusOut={false}
      >
        <div
          {...form.getFloatingProps()}
          ref={form.refs.setFloating}
          className="floating-event-form"
          style={{
            ...form.floatingStyles,
            zIndex: formZIndex,
          }}
        >
          <EventForm
            event={draft}
            isDraft={true}
            isExistingEvent={existing}
            onClose={onClose}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onSubmit={onSave}
            setEvent={setEvent}
          />
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
}
