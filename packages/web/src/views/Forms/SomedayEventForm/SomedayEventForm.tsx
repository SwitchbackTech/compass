import React, { KeyboardEvent, MouseEvent, useCallback, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { OptionsOrDependencyArray } from "react-hotkeys-hook/dist/types";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Key } from "ts-key-enum";
import { ID_SOMEDAY_EVENT_FORM } from "@web/common/constants/web.constants";
import { colorByPriority } from "@web/common/styles/theme.util";
import {
  setEventStartEndDatesToCurrentMonth,
  setEventStartEndDatesToCurrentWeek,
} from "@web/common/utils/web.date.util";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { useAppDispatch } from "@web/store/store.hooks";
import { useDraftContext } from "@web/views/Calendar/components/Draft/context/useDraftContext";
import { DeleteButton } from "@web/views/Forms/EventForm/DeleteButton";
import { DuplicateButton } from "@web/views/Forms/EventForm/DuplicateButton";
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
  enableOnFormTags: ["input"],
};

export const SomedayEventForm: React.FC<FormProps> = ({
  event,
  onClose,
  onSubmit,
  setEvent,
  ...props
}) => {
  const dispatch = useAppDispatch();
  const { actions } = useDraftContext();

  const { priority, title } = event || {};
  const bgColor = colorByPriority[priority];

  const origRecurrence = useRef(event?.recurrence).current;

  const ignoreDelete = (e: KeyboardEvent) => {
    if (e.key === Key.Backspace) {
      e.stopPropagation();
    }
    if (e.metaKey && e.key === Key.Enter) {
      e.preventDefault();
      _onSubmit();
    }
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

  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === Key.Backspace) {
      e.stopPropagation();
    }
  };

  useHotkeys(
    "delete",
    () => {
      console.log("delete");
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

  useHotkeys(
    "enter",
    () => {
      _onSubmit();
    },
    hotkeysOptions,
  );

  useHotkeys(
    "meta+enter",
    (e) => {
      e.preventDefault();
      _onSubmit();
    },
    hotkeysOptions,
    [_onSubmit],
  );

  useHotkeys(
    "ctrl+meta+up",
    (e) => {
      e.preventDefault();
      const updatedEvent = setEventStartEndDatesToCurrentWeek(event);
      onSubmit(updatedEvent);
    },
    hotkeysOptions,
    [event],
  );

  useHotkeys(
    "ctrl+meta+down",
    async (e) => {
      e.preventDefault();
      const updatedEvent = setEventStartEndDatesToCurrentMonth(event);
      onSubmit(updatedEvent);
    },
    hotkeysOptions,
    [event],
  );

  const onSetEventField: SetEventFormField = (field) => {
    const newEvent = { ...event, ...field };

    if (field === null) {
      delete newEvent[field];
    }

    setEvent(newEvent);
  };

  const stopPropagation = (e: MouseEvent) => {
    e.stopPropagation();
  };

  const onDuplicateEvent = useCallback(() => {
    actions.duplicateEvent();
    onClose();
  }, [actions.duplicateEvent, onClose]);

  return (
    <StyledEventForm
      {...props}
      name={ID_SOMEDAY_EVENT_FORM}
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
        <DeleteButton onClick={onDelete} />
        <DuplicateButton onClick={onDuplicateEvent} />
      </StyledIconRow>

      <StyledTitle
        autoFocus
        onChange={onChangeEventTextField("title")}
        onKeyDown={ignoreDelete}
        placeholder="Title"
        role="input"
        title="title"
        underlineColor={colorByPriority[priority]}
        value={title}
      />

      <PrioritySection onSetEventField={onSetEventField} priority={priority} />

      <RepeatSection
        bgColor={bgColor}
        onSetEventField={onSetEventField}
        recurrence={event.recurrence}
      />

      <StyledDescription
        onChange={onChangeEventTextField("description")}
        onKeyDown={ignoreDelete}
        placeholder="Description"
        underlineColor={colorByPriority[priority]}
        value={event.description || ""}
      />

      <SaveSection priority={priority} onSubmit={_onSubmit} />
    </StyledEventForm>
  );
};
