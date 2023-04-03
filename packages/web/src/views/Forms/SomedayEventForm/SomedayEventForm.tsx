import React, { MouseEvent } from "react";
import { Key } from "ts-key-enum";
import { useAppDispatch } from "@web/store/store.hooks";
import { DeleteIcon } from "@web/components/Icons";
import { ID_SIDEBAR_FORM } from "@web/common/constants/web.constants";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { PrioritySection } from "@web/views/Forms/EventForm/PrioritySection";
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
  onConvert,
  onSubmit,
  setEvent,
  ...props
}) => {
  const dispatch = useAppDispatch();

  const { priority, title } = event || {};

  const onChangeEventTextField =
    (fieldName: "title" | "description") =>
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onSetEventField(fieldName, e.target.value);
    };

  const onDelete = () => {
    if (event._id) {
      dispatch(getSomedayEventsSlice.actions.delete({ _id: event._id }));
    }

    _onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    e.stopPropagation();
    switch (e.key) {
      case Key.Escape: {
        _onClose();
        break;
      }
      case Key.Enter: {
        if (e.metaKey) {
          onSubmit(event);
          return;
        }
        break;
      }
      default:
        return;
    }
  };

  const onSetEventField: SetEventFormField = (field, value) => {
    const newEvent = { ...event, [field]: value };
    setEvent(newEvent);
  };

  const stopPropagation = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <StyledEventForm
      {...props}
      data-testid="somedayForm"
      id={ID_SIDEBAR_FORM}
      isOpen={true}
      onClick={stopPropagation}
      onKeyDown={onKeyDown}
      onMouseDown={stopPropagation}
      onMouseUp={(e) => {
        e.stopPropagation();
      }}
      priority={priority}
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
        value={title}
      />

      <PrioritySection onSetEventField={onSetEventField} priority={priority} />

      <StyledDescriptionField
        onChange={onChangeEventTextField("description")}
        placeholder="Description"
        value={event.description || ""}
      />

      <SaveSection priority={priority} onSubmit={onSubmit} />
    </StyledEventForm>
  );
};
