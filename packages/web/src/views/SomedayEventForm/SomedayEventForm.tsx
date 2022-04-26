import React, { useEffect } from "react";
import { Key } from "ts-keycode-enum";
import { useDispatch } from "react-redux";
import { Schema_Event } from "@core/types/event.types";
import {
  StyledDescriptionField,
  StyledEventForm,
  StyledIconRow,
  StyledTitleField,
} from "@web/views/EventForm/styled";
import { DeleteIcon } from "@web/components/Icons";
import { PrioritySection } from "@web/views/EventForm/PrioritySection";
import { FormProps, SetEventFormField } from "@web/views/EventForm/types";

export const SomedayEventForm: React.FC<FormProps> = ({
  event,
  onClose: _onClose,
  onDelete: _onDelete,
  onSubmit,
  setEvent,
  ...props
}) => {
  const dispatch = useDispatch();

  useEffect(() => {
    setEvent(event || {});
    const keyDownHandler = (e: KeyboardEvent) => {
      if (e.which !== Key.Escape) return;
      _onClose();
    };
    // setTimeout(_onClose);

    document.addEventListener("keydown", keyDownHandler);

    return () => {
      document.removeEventListener("keydown", keyDownHandler);
    };
  }, [_onClose]);

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
    //   [fieldName]: value,
    // }));
  };

  const onSomedayDelete = () => {
    _onClose();
    if (event._id === undefined) {
      return; // event was never created, so no need to dispatch delete
    }
    _onDelete;
  };

  const onEnterKey: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.which !== Key.Enter) return;

    e.preventDefault();
    e.stopPropagation();

    console.log("onenterkey");
    onSubmit(event);
  };

  return (
    <StyledEventForm {...props} isOpen={true} priority={event.priority}>
      <StyledIconRow>
        <DeleteIcon onDelete={onSomedayDelete} title="Delete Someday Event" />
      </StyledIconRow>

      <StyledTitleField
        autoFocus
        placeholder="Title"
        onKeyDown={onEnterKey}
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
    </StyledEventForm>
  );
};
