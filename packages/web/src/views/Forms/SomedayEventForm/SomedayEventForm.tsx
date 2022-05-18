import React, { useEffect, useState } from "react";
import { Key } from "ts-keycode-enum";
import { useDispatch } from "react-redux";
import { DeleteIcon } from "@web/components/Icons";
import { getFutureEventsSlice } from "@web/ducks/events/slice";
import { PrioritySection } from "@web/views/Forms/EventForm/PrioritySection";
import { MonthPicker } from "@web/views/Forms/EventForm/MonthPicker";
import { SaveSection } from "@web/views/Forms/EventForm/SaveSection";
import { FormProps, SetEventFormField } from "@web/views/Forms/EventForm/types";
import {
  StyledDescriptionField,
  StyledEventForm,
  StyledIconRow,
  StyledTitleField,
} from "@web/views/Forms/EventForm/styled";

export const SomedayEventForm: React.FC<FormProps> = ({
  event,
  onClose: _onClose,
  onSubmit,
  setEvent,
  ...props
}) => {
  useEffect(() => {
    const keyDownHandler = (e: KeyboardEvent) => {
      if (e.which === Key.Escape) {
        _onClose();
      }
    };

    document.addEventListener("keydown", keyDownHandler);

    return () => {
      document.removeEventListener("keydown", keyDownHandler);
    };
  }, [_onClose]);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const dispatch = useDispatch();

  const onChangeEventTextField =
    (fieldName: "title" | "description") =>
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onSetEventField(fieldName, e.target.value);
    };

  // $$ TODO DRY with EventForm's version
  const onSetEventField: SetEventFormField = (field, value) => {
    const newEvent = { ...event, [field]: value };
    setEvent(newEvent);

    // $$ remove after confident above works
    // setEvent((_event) => ({
    //   ..._event,
    //   [field]: value,
    // }));
  };

  const onDelete = () => {
    if (event._id === undefined) {
      return; // event was never created, so no need to dispatch delete
    }
    dispatch(getFutureEventsSlice.actions.delete({ _id: event._id }));

    _onClose();
  };

  const keyHandler: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.which === Key.Escape) {
      _onClose();
    }

    if (e.which === Key.Tab) {
      isPickerOpen && setIsPickerOpen(false);
    }

    if (e.which === Key.Enter && e.metaKey) {
      onSubmit(event);
    }

    // prevents triggering other shortcuts
    e.stopPropagation();
  };

  return (
    <StyledEventForm
      {...props}
      isOpen={true}
      onKeyDown={keyHandler}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onMouseUp={(e) => {
        if (isPickerOpen) {
          setIsPickerOpen(false);
        }
        e.stopPropagation();
      }}
      priority={event.priority}
      role="form"
    >
      <StyledIconRow>
        <DeleteIcon onDelete={onDelete} title="Delete Someday Event" />
      </StyledIconRow>

      <StyledTitleField
        autoFocus
        onChange={onChangeEventTextField("title")}
        placeholder="Title"
        role="input"
        title="title"
        value={event.title}
      />

      <PrioritySection
        onSetEventField={onSetEventField}
        priority={event.priority}
      />

      <MonthPicker
        isPickerOpen={isPickerOpen}
        onSetEventField={onSetEventField}
        setIsPickerOpen={setIsPickerOpen}
        startMonth={event.startDate}
      />

      <StyledDescriptionField
        onChange={onChangeEventTextField("description")}
        placeholder="Description"
        value={event.description || ""}
      />

      <SaveSection onSubmit={onSubmit} />
    </StyledEventForm>
  );
};
