import {
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { useCallback, useId, useState } from "react";
import { RecurringEventUpdateScope } from "@core/types/event.types";
import { Z_INDEX_MODAL } from "@web/common/constants/web.constants";
import { DirtyParser } from "@web/common/parsers/dirty.parser";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  OverlayPanelActionButton,
  OverlayPanelActions,
} from "@web/components/OverlayPanel/OverlayPanel";
import { selectDraft } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";
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

export function RecurringEventUpdateScopeDialog() {
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
      draft={draft}
      onUpdateScopeChange={onUpdateScopeChange}
      setRecurrenceUpdateScopeDialogOpen={setRecurrenceUpdateScopeDialogOpen}
    />
  );
}

export interface RecurringEventUpdateScopeDialogContentProps {
  draft: Schema_GridEvent | null;
  onUpdateScopeChange: (applyTo: RecurringEventUpdateScope) => void;
  setRecurrenceUpdateScopeDialogOpen: (isOpen: boolean) => void;
}

export function RecurringEventUpdateScopeDialogContent({
  draft,
  onUpdateScopeChange,
  setRecurrenceUpdateScopeDialogOpen,
}: RecurringEventUpdateScopeDialogContentProps) {
  const reduxDraft = useAppSelector(selectDraft);
  const currentDraft = draft ?? reduxDraft;
  const recurrenceChanged =
    currentDraft && reduxDraft
      ? DirtyParser.recurrenceChanged(currentDraft, reduxDraft)
      : false;
  const options = recurrenceChanged
    ? RECURRENCE_CHANGED_UPDATE_SCOPE_OPTIONS
    : UPDATE_SCOPE_OPTIONS;
  const [fallbackScope] = options;

  const [selectedScope, setSelectedScope] =
    useState<RecurringEventUpdateScope>(fallbackScope);
  const activeScope = options.includes(selectedScope)
    ? selectedScope
    : fallbackScope;

  const titleId = useId();

  const closeDialog = useCallback(() => {
    setRecurrenceUpdateScopeDialogOpen(false);
  }, [setRecurrenceUpdateScopeDialogOpen]);

  const onSubmitHandler = useCallback(() => {
    onUpdateScopeChange(activeScope);
    setSelectedScope(RecurringEventUpdateScope.THIS_EVENT);
  }, [activeScope, onUpdateScopeChange]);

  const { refs, context } = useFloating({
    open: true,
    onOpenChange: (open) => {
      if (!open) closeDialog();
    },
  });

  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "dialog" });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  const handleRadioGroupKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onSubmitHandler();
      }
    },
    [onSubmitHandler],
  );

  return (
    <FloatingPortal>
      <FloatingOverlay
        className="flex items-center justify-center bg-bg-primary/85 backdrop-blur-sm"
        lockScroll
        style={{ zIndex: Z_INDEX_MODAL }}
      >
        <FloatingFocusManager context={context} modal>
          {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: role="dialog" is injected at runtime via getFloatingProps() */}
          <div
            ref={refs.setFloating}
            {...getFloatingProps()}
            className="flex w-[400px] max-w-[90vw] flex-col items-center gap-6 rounded-xl bg-panel-bg p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]"
            aria-labelledby={titleId}
          >
            <div className="flex w-full items-center justify-between gap-3">
              <h2
                id={titleId}
                className="m-0 line-clamp-2 w-full min-w-0 font-semibold text-lg text-text-lighter"
              >
                Apply changes to
              </h2>
            </div>

            <div
              role="radiogroup"
              aria-label="Apply changes to"
              className="flex w-full flex-col gap-1"
              onKeyDown={handleRadioGroupKeyDown}
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
              <OverlayPanelActionButton
                variant="primary"
                onClick={onSubmitHandler}
              >
                Ok
              </OverlayPanelActionButton>
            </OverlayPanelActions>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
