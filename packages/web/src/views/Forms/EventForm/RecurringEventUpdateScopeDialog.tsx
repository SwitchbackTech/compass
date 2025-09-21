import React, { useCallback, useState } from "react";
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
import { Priorities, Priority } from "@core/constants/core.constants";
import { RecurringEventUpdateScope } from "@core/types/event.types";
import { SaveSection } from "@web/views/Forms/EventForm/SaveSection/SaveSection";
import { StyledEventForm } from "@web/views/Forms/EventForm/styled";
import { theme } from "../../../common/styles/theme";

export function RecurringEventUpdateScopeDialog(props: {
  open?: boolean;
  priority?: Priority;
  onSubmit: (value: RecurringEventUpdateScope) => unknown;
  onOpenChange?: (open: boolean) => unknown;
}) {
  const { onOpenChange, onSubmit, ...floatingProps } = props;
  const { context, refs, floatingStyles } = useFloating({
    open: floatingProps.open,
    onOpenChange,
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

  const options: Array<[string, RecurringEventUpdateScope]> = [
    ["this", RecurringEventUpdateScope.THIS_EVENT],
    ["this-and-following", RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS],
    ["all", RecurringEventUpdateScope.ALL_EVENTS],
  ];

  const onSubmitHandler = useCallback(() => onSubmit(value), [value, onSubmit]);

  if (!props.open) return null;

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
            {...interactions.getFloatingProps(floatingProps)}
          >
            <StyledEventForm role="form" priority={props.priority}>
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
                      id={`recurring-event-update-scope-select--${id}`}
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
                priority={props.priority ?? Priorities.UNASSIGNED}
                onSubmit={onSubmitHandler}
                onCancel={() => onOpenChange?.(false)}
              />
            </StyledEventForm>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
