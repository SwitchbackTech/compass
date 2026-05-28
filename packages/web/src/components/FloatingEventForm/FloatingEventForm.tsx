import {
  FloatingFocusManager,
  FloatingPortal,
  type UseInteractionsReturn,
  type useFloating,
} from "@floating-ui/react";
import { useCallback } from "react";
import { type Schema_Event } from "@core/types/event.types";
import {
  Z_INDEX_FLOATING_FORM,
  ZIndex,
} from "@web/common/constants/web.constants";
import { useGridMaxZIndex } from "@web/common/hooks/useGridMaxZIndex";
import {
  CursorItem,
  useFloatingNodeIdAtCursor,
  useFloatingOpenAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { selectDraft } from "@web/ducks/events/selectors/draft.selectors";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { EventForm } from "@web/views/Forms/EventForm/EventForm";
import { useCloseEventForm } from "@web/views/Forms/hooks/useCloseEventForm";
import { useDeleteEvent } from "@web/views/Forms/hooks/useDeleteEvent";
import { useDuplicateEvent } from "@web/views/Forms/hooks/useDuplicateEvent";
import { useSaveEventForm } from "@web/views/Forms/hooks/useSaveEventForm";

export function FloatingEventForm({
  floating,
  interactions,
}: {
  floating: ReturnType<typeof useFloating>;
  interactions: UseInteractionsReturn;
}) {
  const dispatch = useAppDispatch();
  const draft = useAppSelector(selectDraft);
  const _id = draft?._id;
  const nodeId = useFloatingNodeIdAtCursor();
  const floatingOpenAtCursor = useFloatingOpenAtCursor();
  const onSave = useSaveEventForm();
  const onDelete = useDeleteEvent(draft?._id as string);
  const onDuplicate = useDuplicateEvent(draft?._id as string);
  const onClose = useCloseEventForm();
  const maxZIndex = useGridMaxZIndex();
  const formZIndex = Math.max(
    maxZIndex + ZIndex.LAYER_1,
    Z_INDEX_FLOATING_FORM,
  );
  const isOpenAtCursor = nodeId === CursorItem.EventForm;
  const open = floatingOpenAtCursor && isOpenAtCursor && !!draft;
  const existing = useAppSelector((state) =>
    _id ? Boolean(selectEventById(state, _id)) : false,
  );

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
        context={floating.context}
        closeOnFocusOut={false}
        order={["reference"]}
      >
        <div
          {...interactions.getFloatingProps()}
          ref={floating.refs.setFloating}
          className="floating-event-form"
          style={{
            ...floating.context.floatingStyles,
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
