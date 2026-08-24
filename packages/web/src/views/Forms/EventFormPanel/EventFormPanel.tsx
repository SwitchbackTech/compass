import {
  type Dispatch,
  lazy,
  type ReactNode,
  type SetStateAction,
  Suspense,
  useCallback,
  useEffect,
} from "react";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { prefetchEventForm } from "@web/views/Forms/EventForm/prefetch-event-form";

// Lazy: EventForm transitively pulls in TipTap, react-datepicker, and
// react-select — none of which should download on app boot. This is the only
// static edge into that graph, so splitting here keeps the editor stack in
// its own chunk until a form actually opens (or the prefetch below warms it).
const EventForm = lazy(() =>
  import("@web/views/Forms/EventForm/EventForm").then((module) => ({
    default: module.EventForm,
  })),
);

export type EventFormPanelConfirmation = {
  onDelete: () => void;
  onSubmit: (draft: GridEventDraft) => void | Promise<void>;
};

export type EventFormPanelProps = {
  confirmation: EventFormPanelConfirmation;
  confirmationUi?: ReactNode;
  draft: GridEventDraft | null;
  fieldErrors?: Record<string, string>;
  isDraft: boolean;
  isExistingEvent: boolean;
  isFormOpen: boolean;
  onClose: () => void;
  onDuplicate?: (draft: GridEventDraft) => void;
  syncDraft: (draft: GridEventDraft | null) => void;
};

/**
 * Shared sidebar wiring for Day and Week event forms: resolves functional
 * setDraft updates, guards on open state, and delegates save/delete through
 * the caller's confirmation strategy.
 */
export function EventFormPanel({
  confirmation,
  confirmationUi,
  draft,
  fieldErrors,
  isDraft,
  isExistingEvent,
  isFormOpen,
  onClose,
  onDuplicate,
  syncDraft,
}: EventFormPanelProps) {
  const setDraft: Dispatch<SetStateAction<GridEventDraft | null>> = useCallback(
    (next) => {
      const resolved = typeof next === "function" ? next(draft) : next;
      syncDraft(resolved);
    },
    [draft, syncDraft],
  );

  // Warm the EventForm chunk on the user's first input so the form opens
  // without a visible fetch. Deliberately input-driven rather than a timer:
  // an idle timer would fire during Lighthouse's trace window and count the
  // chunk back into the boot script-transfer budget it was split to avoid.
  useEffect(() => {
    const listenerOptions = { capture: true, passive: true } as const;
    window.addEventListener("pointermove", prefetchEventForm, listenerOptions);
    window.addEventListener("pointerdown", prefetchEventForm, listenerOptions);
    window.addEventListener("keydown", prefetchEventForm, listenerOptions);
    return () => {
      window.removeEventListener("pointermove", prefetchEventForm, true);
      window.removeEventListener("pointerdown", prefetchEventForm, true);
      window.removeEventListener("keydown", prefetchEventForm, true);
    };
  }, []);

  if (!isFormOpen || !draft) return null;

  return (
    <Suspense fallback={null}>
      <EventForm
        draft={draft}
        fieldErrors={fieldErrors}
        isDraft={isDraft}
        isExistingEvent={isExistingEvent}
        onClose={onClose}
        onDelete={confirmation.onDelete}
        onDuplicate={onDuplicate}
        onSubmit={(nextDraft) => {
          if (nextDraft) void confirmation.onSubmit(nextDraft);
        }}
        setDraft={setDraft}
      />
      {confirmationUi}
    </Suspense>
  );
}
