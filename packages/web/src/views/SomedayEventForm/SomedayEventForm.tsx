import React, { useEffect } from "react";
import { Key } from "ts-keycode-enum";
import { useDispatch } from "react-redux";
import { DeleteIcon } from "@web/components/Icons";
import { deleteEventSlice } from "@web/ducks/events/slice";
import { PrioritySection } from "@web/views/EventForm/PrioritySection";
import { SaveSection } from "@web/views/EventForm/SaveSection";
import { FormProps, SetEventFormField } from "@web/views/EventForm/types";
import {
  StyledDescriptionField,
  StyledEventForm,
  StyledIconRow,
  StyledTitleField,
} from "@web/views/EventForm/styled";

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
    // setTimeout(_onClose);

    document.addEventListener("keydown", keyDownHandler);

    return () => {
      document.removeEventListener("keydown", keyDownHandler);
    };
  }, [_onClose]);

  const dispatch = useDispatch();

  const onChangeEventTextField =
    (fieldName: "title" | "description") =>
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onSetEventField(fieldName, e.target.value);
    };

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
    _onClose();
    if (event._id === undefined) {
      return; // event was never created, so no need to dispatch delete
    }

    dispatch(deleteEventSlice.actions.request({ _id: event._id }));
  };

  const keyHandler: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.which === Key.Escape) {
      _onClose();
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
      priority={event.priority}
    >
      <StyledIconRow>
        <DeleteIcon onDelete={onDelete} title="Delete Someday Event" />
      </StyledIconRow>

      <StyledTitleField
        autoFocus
        placeholder="Title"
        value={event.title}
        onChange={onChangeEventTextField("title")}
      />

      <PrioritySection
        onSetEventField={onSetEventField}
        priority={event.priority}
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
