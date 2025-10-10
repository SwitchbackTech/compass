import React, { useCallback, useMemo, useState } from "react";
import {
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { Priorities } from "@core/constants/core.constants";
import { RecurringEventUpdateScope } from "@core/types/event.types";
import { DirtyParser } from "@web/common/parsers/dirty.parser";
import { theme } from "@web/common/styles/theme";
import { Schema_WebEvent } from "@web/common/types/web.event.types";
import { selectDraft } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useDraftContext } from "@web/views/Calendar/components/Draft/context/useDraftContext";
import { SaveSection } from "@web/views/Forms/EventForm/SaveSection/SaveSection";
import { StyledEventForm } from "@web/views/Forms/EventForm/styled";

export function RecurringEventUpdateScopeDialog() {
  const {
    confirmation,
    state: { draft },
  } = useDraftContext();
  const { isRecurrenceUpdateScopeDialogOpen } = confirmation;
  const { setRecurrenceUpdateScopeDialogOpen } = confirmation;
  const { onUpdateScopeChange } = confirmation;
  const reduxDraft = useAppSelector(selectDraft);
  const { UNASSIGNED } = Priorities;
  const priority = draft?.priority ?? reduxDraft?.priority ?? UNASSIGNED;

  const recurrenceChanged = DirtyParser.recurrenceChanged(
    (draft as Schema_WebEvent) ?? reduxDraft,
    reduxDraft!,
  );

  const { context, refs, floatingStyles } = useFloating({
    open: isRecurrenceUpdateScopeDialogOpen,
    onOpenChange: setRecurrenceUpdateScopeDialogOpen,
    strategy: "absolute",
    placement: "bottom",
    transform: true,
  });

  const [value, setValue] = useState<RecurringEventUpdateScope>(
    RecurringEventUpdateScope.THIS_EVENT,
  );

  const click = useClick(context);
  const role = useRole(context);
  const dismiss = useDismiss(context, { outsidePressEvent: "mousedown" });
  const interactions = useInteractions([click, role, dismiss]);

  const _options: Array<[string, RecurringEventUpdateScope]> = [
    ["this", RecurringEventUpdateScope.THIS_EVENT],
    ["this-and-following", RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS],
    ["all", RecurringEventUpdateScope.ALL_EVENTS],
  ];

  const options = useMemo<Array<[string, RecurringEventUpdateScope]>>(() => {
    if (!recurrenceChanged) return _options;

    return _options.slice(1);
  }, [recurrenceChanged]);

  const onSubmitHandler = useCallback(() => {
    onUpdateScopeChange(value);
    setValue(RecurringEventUpdateScope.THIS_EVENT);
  }, [value, onUpdateScopeChange]);

  if (!isRecurrenceUpdateScopeDialogOpen) return null;

  return (
    <FloatingPortal>
      <FloatingOverlay
        className="dialog-overlay"
        style={{ background: "rgba(0, 0, 0, 0.8)", zIndex: 4 }}
        lockScroll
      >
        <FloatingFocusManager context={context}>
          <div
            ref={refs.setFloating}
            style={{ ...floatingStyles, top: "50%", left: "50%" }}
            {...interactions.getFloatingProps()}
          >
            <StyledEventForm role="form" priority={priority}>
              <fieldset style={{ borderRadius: theme.shape.borderRadius }}>
                <legend>Apply Changes To</legend>

                {options.map(([id, option], key) => (
                  <div key={key}>
                    <input
                      type="radio"
                      name="recurring-event-update-scope"
                      value={option}
                      onChange={() => setValue(option)}
                      checked={value === option}
                      id={`recurring-event-update-scope-select-${id}`}
                    />

                    <label
                      htmlFor={`recurring-event-update-scope-select--${id}`}
                    >
                      {option}
                    </label>
                  </div>
                ))}
              </fieldset>

              <SaveSection
                saveText="Ok"
                priority={priority}
                onSubmit={onSubmitHandler}
                onCancel={() => setRecurrenceUpdateScopeDialogOpen(false)}
              />
            </StyledEventForm>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
