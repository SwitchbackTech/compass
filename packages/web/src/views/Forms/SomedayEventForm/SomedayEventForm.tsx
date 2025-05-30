import React, { KeyboardEvent, MouseEvent, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { OptionsOrDependencyArray } from "react-hotkeys-hook/dist/types";
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

const hotkeysOptions: OptionsOrDependencyArray = {
  enableOnFormTags: ["input", "textarea", "button", "select"],
};

export const SomedayEventForm: React.FC<FormProps> = ({
  event,
  onClose,
  onSubmit,
  setEvent,
  ...props
}) => {
  const dispatch = useAppDispatch();

  const { priority, title } = event || {};
  const bgColor = colorByPriority[priority];

  const origRecurrence = useRef(event?.recurrence).current;

  const handleIgnoredKeys = (e: KeyboardEvent) => {
    if (e.key === Key.Backspace) {
      e.stopPropagation();
    }
  };

  const stopPropagation = (e: MouseEvent) => {
    e.stopPropagation();
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

  const onSetEventField: SetEventFormField = (field) => {
    setEvent({ ...event, ...field });
  };

  const handleFormKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    // Handle form-wide keyboard events
    if ((e.metaKey || e.ctrlKey) && e.key === Key.Enter) {
      e.preventDefault();
      _onSubmit();
    }

    if (e.key === Key.Backspace) {
      e.stopPropagation();
    }
  };

  useHotkeys(
    "delete",
    () => {
      const confirmed = window.confirm(
        `Delete ${event.title || "this event"}?`,
      );

      if (confirmed) {
        onDelete();
        onClose();
      }
    },
    hotkeysOptions,
  );

  return (
    <StyledEventForm
      {...props}
      name={ID_SOMEDAY_EVENT_FORM}
      isOpen={true}
      onClick={stopPropagation}
      onKeyDown={handleFormKeyDown}
      onMouseDown={stopPropagation}
      onMouseUp={stopPropagation}
      priority={priority}
      role="form"
    >
      <StyledIconRow>
        <DeleteButton onClick={onDelete} />
      </StyledIconRow>

      <StyledTitle
        autoFocus
        onChange={onChangeEventTextField("title")}
        onKeyDown={handleIgnoredKeys}
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
        onKeyDown={handleIgnoredKeys}
        placeholder="Description"
        value={event.description || ""}
      />

      <SaveSection priority={priority} onSubmit={_onSubmit} />
    </StyledEventForm>
  );
};
