import React, { MouseEvent, useRef } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Key } from "ts-key-enum";
import { colorNameByPriority } from "@core/constants/colors";
import { getColor } from "@core/util/color.utils";
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

import { RepeatSection } from "../EventForm/RepeatSection";

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
  const bgColor = getColor(colorNameByPriority[priority]);

  const origRecurrence = useRef(event?.recurrence).current;

  const _onSubmit = () => {
    const hasInstances = origRecurrence?.eventId !== undefined;
    const removedRecurrence =
      hasInstances && event.recurrence?.rule?.length === 0;

    if (removedRecurrence) {
      onSetEventField("recurrence", { ...event.recurrence, rule: null });
    }

    onSubmit(event);
  };

  const onChangeEventTextField =
    (fieldName: "title" | "description") =>
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onSetEventField(fieldName, e.target.value);
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
          _onSubmit();
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

    if (value === null) {
      delete newEvent[field];
    }

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

      <RepeatSection
        bgColor={bgColor}
        onSetEventField={onSetEventField}
        recurrence={event.recurrence}
      />

      <StyledDescriptionField
        onChange={onChangeEventTextField("description")}
        placeholder="Description"
        value={event.description || ""}
      />

      <SaveSection priority={priority} onSubmit={_onSubmit} />
    </StyledEventForm>
  );
};
