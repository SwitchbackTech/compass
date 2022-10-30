import React, { KeyboardEventHandler, MouseEvent, useState } from "react";
import { Key } from "ts-key-enum";
import { useDispatch } from "react-redux";
import { DeleteIcon } from "@web/components/Icons";
import { ID_SIDEBAR_FORM } from "@web/common/constants/web.constants";
import { getFutureEventsSlice } from "@web/ducks/events/event.slice";
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
  const dispatch = useDispatch();

  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const onChangeEventTextField =
    (fieldName: "title" | "description") =>
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onSetEventField(fieldName, e.target.value);
    };

  const onSetEventField: SetEventFormField = (field, value) => {
    const newEvent = { ...event, [field]: value };
    setEvent(newEvent);
  };

  const onDelete = () => {
    if (event._id) {
      dispatch(getFutureEventsSlice.actions.delete({ _id: event._id }));
    }

    _onClose();
  };

  const onKeyDown: KeyboardEventHandler<HTMLFormElement> = (e) => {
    e.stopPropagation();

    switch (e.key) {
      case Key.Escape: {
        _onClose();
        break;
      }
      case Key.Tab: {
        isPickerOpen && setIsPickerOpen(false);
        break;
      }
      case Key.Enter: {
        if (e.metaKey) {
          onSubmit(event);
        }
        break;
      }
      default:
        return;
    }
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
        if (isPickerOpen) {
          console.log("!!closing picker");
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

      <SaveSection priority={event.priority} onSubmit={onSubmit} />
    </StyledEventForm>
  );
};
