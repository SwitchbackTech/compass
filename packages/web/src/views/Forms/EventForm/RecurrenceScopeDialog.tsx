import { useCallback, useState } from "react";
import {
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { DirtyParser } from "@web/common/utils/parse/dirty.parser";
import {
  OverlayPanel,
  OverlayPanelActionButton,
  OverlayPanelActions,
} from "@web/components/OverlayPanel/OverlayPanel";
import { gridEventDraftToSchemaEvent } from "@web/events/grid-event-draft.adapter";
import { selectDraft, useDraftStore } from "@web/events/stores/draft.store";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";

const UPDATE_SCOPE_OPTIONS: RecurringEventUpdateScope[] = [
  RecurringEventUpdateScope.THIS_EVENT,
  RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS,
  RecurringEventUpdateScope.ALL_EVENTS,
];

const RECURRENCE_CHANGED_UPDATE_SCOPE_OPTIONS: RecurringEventUpdateScope[] = [
  RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS,
  RecurringEventUpdateScope.ALL_EVENTS,
];

const updateScopeOptionClassName =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded px-3 text-base text-text-lighter transition-colors hover:bg-panel-badge-bg";

const selectedUpdateScopeOptionClassName = "bg-panel-badge-bg";

const radioDotClassName =
  "relative flex size-[18px] flex-none rounded-full border-2 border-border-secondary transition-colors after:absolute after:inset-0 after:m-auto after:size-2 after:scale-0 after:rounded-full after:bg-accent-primary after:transition-transform peer-checked:border-accent-primary peer-checked:after:scale-100 peer-focus-visible:ring-2 peer-focus-visible:ring-accent-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-panel-bg";

export function RecurrenceScopeDialog() {
  const {
    confirmation,
    state: { draft },
  } = useDraftContext();
  const {
    isRecurrenceUpdateScopeDialogOpen,
    setRecurrenceUpdateScopeDialogOpen,
    onUpdateScopeChange,
  } = confirmation;
  if (!isRecurrenceUpdateScopeDialogOpen) return null;

  return (
    <RecurringEventUpdateScopeDialogContent
      draft={draft ? gridEventDraftToSchemaEvent(draft) : null}
      onUpdateScopeChange={onUpdateScopeChange}
      setRecurrenceUpdateScopeDialogOpen={setRecurrenceUpdateScopeDialogOpen}
    />
  );
}

interface RecurringEventUpdateScopeDialogContentProps {
  draft: Schema_Event | null;
  onUpdateScopeChange: (applyTo: RecurringEventUpdateScope) => void;
  recurrenceChanged?: boolean;
  setRecurrenceUpdateScopeDialogOpen: (isOpen: boolean) => void;
  title?: string;
}

export function RecurringEventUpdateScopeDialogContent({
  draft,
  onUpdateScopeChange,
  recurrenceChanged: recurrenceChangedOverride,
  setRecurrenceUpdateScopeDialogOpen,
  title = "Apply changes to",
}: RecurringEventUpdateScopeDialogContentProps) {
  const draftFromStore = useDraftStore(selectDraft);
  const currentDraft = draft ?? draftFromStore;
  const recurrenceChanged =
    recurrenceChangedOverride ??
    (currentDraft && draftFromStore
      ? DirtyParser.recurrenceChanged(currentDraft, draftFromStore)
      : false);
  const options = recurrenceChanged
    ? RECURRENCE_CHANGED_UPDATE_SCOPE_OPTIONS
    : UPDATE_SCOPE_OPTIONS;
  const [fallbackScope] = options;

  const [selectedScope, setSelectedScope] =
    useState<RecurringEventUpdateScope>(fallbackScope);
  const activeScope = options.includes(selectedScope)
    ? selectedScope
    : fallbackScope;

  const closeDialog = useCallback(() => {
    setRecurrenceUpdateScopeDialogOpen(false);
  }, [setRecurrenceUpdateScopeDialogOpen]);

  const onSubmitHandler = useCallback(() => {
    onUpdateScopeChange(activeScope);
    setSelectedScope(RecurringEventUpdateScope.THIS_EVENT);
  }, [activeScope, onUpdateScopeChange]);

  return (
    <OverlayPanel title={title} onDismiss={closeDialog} variant="modal">
      <div
        role="radiogroup"
        aria-label={title}
        className="flex w-full flex-col gap-1"
      >
        {options.map((option) => {
          const isSelected = activeScope === option;

          return (
            <label
              key={option}
              className={`${updateScopeOptionClassName} ${
                isSelected ? selectedUpdateScopeOptionClassName : ""
              }`}
            >
              <input
                type="radio"
                name="recurring-event-update-scope"
                value={option}
                checked={isSelected}
                onChange={() => setSelectedScope(option)}
                className="peer sr-only"
              />
              <span aria-hidden="true" className={radioDotClassName} />
              {option}
            </label>
          );
        })}
      </div>

      <OverlayPanelActions>
        <OverlayPanelActionButton onClick={closeDialog}>
          Cancel
        </OverlayPanelActionButton>
        <OverlayPanelActionButton variant="primary" onClick={onSubmitHandler}>
          Ok
        </OverlayPanelActionButton>
      </OverlayPanelActions>
    </OverlayPanel>
  );
}
