import { FloatingFocusManager, FloatingPortal } from "@floating-ui/react";
import {
  Z_INDEX_FLOATING_FORM,
  ZIndex,
} from "@web/common/constants/web.constants";
import { useGridMaxZIndex } from "@web/common/hooks/useGridMaxZIndex";
import { EventForm } from "@web/views/Forms/EventForm/EventForm";
import { type FormProps } from "@web/views/Forms/EventForm/types";
import { type CalendarEventFormController } from "@web/views/Forms/hooks/useCalendarEventForm";

interface Props extends Omit<FormProps, "category"> {
  controller: CalendarEventFormController;
}

export function FloatingEventForm({ controller, ...formProps }: Props) {
  const maxZIndex = useGridMaxZIndex();
  const formZIndex = Math.max(
    maxZIndex + ZIndex.LAYER_1,
    Z_INDEX_FLOATING_FORM,
  );

  if (!controller.isOpen) return null;

  return (
    <FloatingPortal>
      <FloatingFocusManager
        closeOnFocusOut={false}
        context={controller.context}
        modal={false}
      >
        <div
          {...controller.getFloatingProps()}
          className="w-max"
          ref={controller.refs.setFloating}
          style={{ ...controller.floatingStyles, zIndex: formZIndex }}
        >
          <EventForm {...formProps} />
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
}
