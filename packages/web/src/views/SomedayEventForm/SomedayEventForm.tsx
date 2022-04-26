import React, { useEffect, useState, useRef } from "react";
import { Key } from "ts-keycode-enum";
import { useDispatch } from "react-redux";
import { Priority } from "@core/core.constants";
import { Schema_Event } from "@core/types/event.types";
import {
  StyledEventForm,
  StyledIconRow,
  StyledTitleField,
} from "@web/views/EventForm/styled";
import { DeleteIcon } from "@web/components/Icons";
import { deleteEventSlice } from "@web/ducks/events/slice";
import { useOnClickOutside } from "@web/common/hooks/useOnClickOutside";

interface BasicProps {
  priority?: Priority;
}

interface Props extends BasicProps {
  event: Schema_Event;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: Schema_Event) => void;
  setEvent: React.Dispatch<React.SetStateAction<Schema_Event>>;
}

interface StyledProps extends BasicProps {
  title?: string;
  isOpen?: boolean;
}
export const SomedayEventForm: React.FC<Props> = ({
  event,
  isOpen,
  onClose: _onClose,
  onSubmit,
  setEvent,
  ...props
}) => {
  const dispatch = useDispatch();

  useEffect(() => {
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

  // $$ DRY
  const onChangeEventTextField =
    (fieldName: "title" | "description") =>
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onSetEventField(fieldName, e.target.value);
    };

  // $$ DRY
  const onSetEventField = <FieldName extends keyof Schema_Event>(
    fieldName: FieldName,
    value: Schema_Event[FieldName]
  ) => {
    setEvent((_event) => ({
      ..._event,
      [fieldName]: value,
    }));
  };

  const onSomedayDelete = () => {
    _onClose();
    if (event._id === undefined) {
      return; // event was never created, so no need to dispatch delete
    }
    console.log("reminder: not dispatching delete for now");
    // dispatch(deleteEventSlice.actions.request({ _id: event._id }));
  };

  // $$ DRY
  const submitFormWithKeyboard: React.KeyboardEventHandler<
    HTMLTextAreaElement
  > = (e) => {
    if (e.which !== Key.Enter) return;

    e.preventDefault();
    e.stopPropagation();

    console.log("submitting ...");
  };

  return (
    <StyledEventForm {...props} isOpen={true} priority={event.priority}>
      <StyledIconRow>
        <DeleteIcon onDelete={onSomedayDelete} title="Delete Someday Event" />
      </StyledIconRow>

      <StyledTitleField
        autoFocus
        placeholder="Title"
        onKeyDown={submitFormWithKeyboard}
        value={event.title}
        onChange={onChangeEventTextField("title")}
      />
    </StyledEventForm>
  );
};
