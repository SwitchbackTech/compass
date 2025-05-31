import React, { KeyboardEvent, MouseEvent, useCallback, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Key } from "ts-key-enum";
import { ID_SOMEDAY_EVENT_FORM } from "@web/common/constants/web.constants";
import { colorByPriority } from "@web/common/styles/theme.util";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { useAppDispatch } from "@web/store/store.hooks";
import { DeleteButton } from "@web/views/Forms/EventForm/DeleteButton";
import { PrioritySection } from "@web/views/Forms/EventForm/PrioritySection";
import { SaveSection } from "@web/views/Forms/EventForm/SaveSection";
import {
  StyledDescription,
  StyledEventForm,
  StyledIconRow,
  StyledTitle,
} from "@web/views/Forms/EventForm/styled";
import { FormProps, SetEventFormField } from "@web/views/Forms/EventForm/types";
import { RepeatSection } from "../EventForm/RepeatSection";

export const SomedayEventForm: React.FC<FormProps> = ({
  event,
  onClose,
  onSubmit,
  onDuplicate,
  onConvert,
  setEvent,
  ...props
}) => {
  const dispatch = useAppDispatch();
  const { priority, title } = event || {};
  const bgColor = colorByPriority[priority];
  const origRecurrence = useRef(event?.recurrence).current;
  const formRef = useRef<HTMLFormElement>(null);

  const stopPropagation = (e: MouseEvent) => {
    e.stopPropagation();
  };

  const onDelete = () => {
    if (event._id) {
      dispatch(getSomedayEventsSlice.actions.delete({ _id: event._id }));

      const isRecurrence = event?.recurrence?.rule?.length > 0;
      const title = event.title || "event";
      const recurTitle = event.title ? `"${event.title}"s` : "events";
      const eventTitle = isRecurrence
        ? `Deleted all future ${recurTitle}`
        : `Deleted ${title}`;
      toast(eventTitle);
    }

    onClose();
  };

  const _onSubmit = () => {
    const hasInstances = origRecurrence?.eventId !== undefined;
    const removedRecurrence =
      hasInstances && event.recurrence?.rule?.length === 0;

    if (removedRecurrence) {
      onSetEventField({ recurrence: { ...event.recurrence, rule: [] } });
    }

    onSubmit(event);
  };

  const onChangeEventTextField =
    (fieldName: "title" | "description") =>
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onSetEventField({ [fieldName]: e.target.value });
    };

  const onSetEventField: SetEventFormField = (field) => {
    setEvent({ ...event, ...field });
  };

  // Centralized keyboard handler: add more hotkeys if desired
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!(e.target instanceof HTMLElement)) return;

      const isTextInput = ["INPUT", "TEXTAREA"].includes(e.target.tagName);
      if (isTextInput && !(e.metaKey || e.ctrlKey)) return;

      switch (true) {
        // Submit (CMD/CTRL+Enter)
        case (e.metaKey || e.ctrlKey) && e.key === Key.Enter:
          e.preventDefault();
          _onSubmit();
          break;

        // Duplicate (CMD/CTRL+D)
        case (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d":
          e.preventDefault();
          onDuplicate?.(event);
          break;

        // Convert (CMD/CTRL+Shift+,)
        case (e.metaKey || e.ctrlKey) && e.shiftKey && e.key === ",":
          e.preventDefault();
          onConvert?.();
          break;

        // Delete (Delete key)
        case e.key === "Delete":
          {
            const confirmed = window.confirm(
              `Delete ${event.title || "this event"}?`
            );
            if (confirmed) {
              onDelete();
            }
          }
          break;

        // Backspace (stop propagation)
        case e.key === Key.Backspace:
          e.stopPropagation();
          break;
      }
    },
    [event, _onSubmit, onDelete, onDuplicate, onConvert]
  );

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    form.addEventListener("keydown", handleKeyDown as EventListener, true);
    return () => {
      form.removeEventListener("keydown", handleKeyDown as EventListener, true);
    };
  }, [handleKeyDown]);

  return (
    <StyledEventForm
      {...props}
      ref={formRef}
      name={ID_SOMEDAY_EVENT_FORM}
      isOpen={true}
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
      onMouseUp={stopPropagation}
      priority={priority}
      role="form"
      tabIndex={-1}
      onSubmit={e => {
        e.preventDefault();
        _onSubmit();
      }}
    >
      <StyledIconRow>
        <DeleteButton onClick={onDelete} />
      </StyledIconRow>

      <StyledTitle
        autoFocus
        onChange={onChangeEventTextField("title")}
        placeholder="Title"
        role="textarea"
        name="Event Title"
        underlineColor={bgColor}
        value={title}
      />

      <PrioritySection
        onSetEventField={onSetEventField}
        priority={priority}
      />

      <RepeatSection event={event} onSetEventField={onSetEventField} />

      <StyledDescription
        underlineColor={bgColor}
        onChange={onChangeEventTextField("description")}
        placeholder="Description"
        value={event.description || ""}
      />

      <SaveSection priority={priority} onSubmit={_onSubmit} />
    </StyledEventForm>
  );
};
