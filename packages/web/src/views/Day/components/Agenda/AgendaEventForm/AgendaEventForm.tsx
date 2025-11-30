import { FloatingFocusManager, FloatingPortal } from "@floating-ui/react";
import { Schema_Event } from "@core/types/event.types";
import { ZIndex } from "@web/common/constants/web.constants";
import { useDayDraftContext } from "@web/views/Day/context/DayDraftContext";
import { EventForm } from "@web/views/Forms/EventForm/EventForm";

export const AgendaEventForm = () => {
  const {
    draftEvent,
    isFormOpen,
    floatingProps,
    closeForm,
    setDraftEvent,
    submitDraft,
  } = useDayDraftContext();

  if (!isFormOpen || !draftEvent) {
    return null;
  }

  const { refs, x, y, strategy, context, getFloatingProps } = floatingProps;

  return (
    <FloatingPortal>
      <FloatingFocusManager context={context}>
        <div
          ref={refs.setFloating}
          style={{
            position: strategy,
            top: y ?? 0,
            left: x ?? 0,
            zIndex: ZIndex.MAX,
          }}
          {...getFloatingProps()}
        >
          <EventForm
            event={draftEvent}
            onClose={closeForm}
            onDelete={closeForm}
            onSubmit={(event: Schema_Event) => submitDraft(event)}
            setEvent={setDraftEvent}
          />
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
};
