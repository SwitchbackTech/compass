import dayjs from "dayjs";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Key } from "ts-key-enum";
import { Priorities } from "@core/constants/core.constants";
import { ID_EVENT_FORM } from "@web/common/constants/web.constants";
import {
  colorByPriority,
  hoverColorByPriority,
} from "@web/common/styles/theme.util";
import { SelectOption } from "@web/common/types/component.types";
import { getCategory } from "@web/common/utils/event.util";
import { mapToBackend } from "@web/common/utils/web.date.util";
import { DateControlsSection } from "@web/views/Forms/EventForm/DateControlsSection";
import { DeleteButton } from "@web/views/Forms/EventForm/DeleteButton";
import { MoveToSidebarButton } from "@web/views/Forms/EventForm/MoveToSidebarButton";
import { getFormDates } from "./DateControlsSection/DateTimeSection/form.datetime.util";
import { PrioritySection } from "./PrioritySection";
import { SaveSection } from "./SaveSection";
import {
  StyledDescription,
  StyledEventForm,
  StyledIconRow,
  StyledTitle,
} from "./styled";
import { FormProps, SetEventFormField } from "./types";

export const EventForm: React.FC<FormProps> = ({
  event,
  onClose: _onClose,
  onConvert,
  onDelete,
  onSubmit,
  onDuplicate,
  setEvent,
  ...props
}) => {
  const { priority, title } = event || {};
  const priorityColor = colorByPriority[priority || Priorities.UNASSIGNED];
  const category = getCategory(event);
  const isDraft = !event._id;

  // Date/time and picker state management
  const [endTime, setEndTime] = useState<SelectOption<string>>({
    label: "1 AM",
    value: "01:00 AM",
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [startTime, setStartTime] = useState<SelectOption<string>>({
    label: "12 AM",
    value: "12:00 AM",
  });
  const [selectedStartDate, setSelectedStartDate] = useState(new Date());
  const [selectedEndDate, setSelectedEndDate] = useState(new Date());
  const [displayEndDate, setDisplayEndDate] = useState(selectedStartDate);

  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Populate state from event on mount/update
  useEffect(() => {
    setEvent(event || {});
    const dt = getFormDates(event.startDate as string, event.endDate as string);
    setStartTime(dt.startTime);
    setSelectedStartDate(dt.startDate);
    setDisplayEndDate(dayjs(dt.displayEndDate).toDate());
    setEndTime(dt.endTime);
    setSelectedEndDate(dt.endDate);
    setIsFormOpen(true);
  }, [event, setEvent]);

  // Controlled field change
  const onChangeEventTextField =
    (fieldName: "title" | "description") =>
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onSetEventField({ [fieldName]: e.target.value });
    };

  const onClose = () => {
    setIsFormOpen(false);
    setTimeout(() => {
      _onClose();
    }, 120);
  };

  const onDeleteForm = () => {
    onDelete?.(event._id);
    onClose();
  };

  // Submit with validation
  const onSubmitForm = () => {
    const selectedDateTimes = {
      startDate: selectedStartDate,
      startTime,
      endDate: selectedEndDate,
      endTime,
      isAllDay: event.isAllDay || false,
    };

    const { startDate, endDate } = mapToBackend(selectedDateTimes);

    if (dayjs(startDate).isAfter(dayjs(endDate))) {
      alert("uff-dah, looks like you got the start & end times mixed up");
      return;
    }

    const finalEvent = {
      ...event,
      priority: event.priority || Priorities.UNASSIGNED,
      startDate,
      endDate,
    };

    onSubmit(finalEvent);
    onClose();
  };

  const onSetEventField: SetEventFormField = (field) => {
    setEvent({ ...event, ...field });
  };

  // Centralized keyboard shortcut handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!(e.target instanceof HTMLElement)) return;

      // Allow typing in text fields unless modifier is pressed
      const isTextInput = ["INPUT", "TEXTAREA"].includes(e.target.tagName);
      if (isTextInput && !(e.metaKey || e.ctrlKey)) return;

      switch (true) {
        // Submit (CMD/CTRL+Enter)
        case (e.metaKey || e.ctrlKey) && e.key === Key.Enter:
          e.preventDefault();
          onSubmitForm();
          break;
        // Duplicate (CMD/CTRL+D)
        case (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d":
          e.preventDefault();
          onDuplicate?.(event);
          break;
        // Convert (CMD/CTRL+Shift+,)
        case (e.metaKey || e.ctrlKey) && e.shiftKey && e.key === ",":
          e.preventDefault();
          !isDraft && onConvert?.();
          break;
        // Delete (Delete key)
        case e.key === "Delete":
          if (isDraft) {
            onClose();
          } else {
            const confirmed = window.confirm(
              `Delete ${event.title || "this event"}?`
            );
            if (confirmed) {
              onDeleteForm();
            }
          }
          break;
        // Backspace (stop propagation)
        case e.key === Key.Backspace:
          e.stopPropagation();
          break;
      }
    },
    [event, isDraft, onDuplicate, onConvert, onSubmitForm, onClose, onDeleteForm]
  );

  // Attach handler only to form
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    form.addEventListener("keydown", handleKeyDown as EventListener, true);
    return () => {
      form.removeEventListener("keydown", handleKeyDown as EventListener, true);
    };
  }, [handleKeyDown]);

  const dateTimeSectionProps = {
    bgColor: priorityColor,
    displayEndDate,
    event,
    category,
    endTime,
    inputColor: hoverColorByPriority[priority || Priorities.UNASSIGNED],
    isEndDatePickerOpen,
    isStartDatePickerOpen,
    onSetEventField,
    selectedEndDate,
    selectedStartDate,
    setEndTime,
    setSelectedEndDate,
    setSelectedStartDate,
    setStartTime,
    startTime,
    setDisplayEndDate,
    setIsEndDatePickerOpen,
    setIsStartDatePickerOpen,
    setEvent,
  };

  const recurrenceSectionProps = {
    bgColor: priorityColor,
    event,
    startTime,
    endTime,
  };

  // Mouse events for pickers
  const handleMouseUp = () => {
    if (isStartDatePickerOpen) setIsStartDatePickerOpen(false);
    if (isEndDatePickerOpen) setIsEndDatePickerOpen(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <StyledEventForm
      {...props}
      ref={formRef}
      isOpen={isFormOpen}
      name={ID_EVENT_FORM}
      onMouseUp={handleMouseUp}
      onMouseDown={handleMouseDown}
      priority={priority}
      role="form"
      tabIndex={-1}
      onSubmit={e => {
        e.preventDefault();
        onSubmitForm();
      }}
    >
      <StyledIconRow>
        {!isDraft && (
          <MoveToSidebarButton
            onClick={() => {
              onConvert?.();
            }}
          />
        )}
        <DeleteButton onClick={onDeleteForm} />
      </StyledIconRow>

      <StyledTitle
        autoFocus
        onChange={onChangeEventTextField("title")}
        placeholder="Title"
        role="textarea"
        name="Event Title"
        underlineColor={priorityColor}
        value={title}
      />

      <PrioritySection
        onSetEventField={onSetEventField}
        priority={priority || Priorities.UNASSIGNED}
      />

      <DateControlsSection
        dateTimeSectionProps={dateTimeSectionProps}
        eventCategory={category}
        recurrenceSectionProps={recurrenceSectionProps}
      />

      <StyledDescription
        underlineColor={priorityColor}
        onChange={onChangeEventTextField("description")}
        placeholder="Description"
        ref={descriptionRef}
        value={event.description || ""}
      />

      <SaveSection
        priority={priority || Priorities.UNASSIGNED}
        onSubmit={onSubmitForm}
      />
    </StyledEventForm>
  );
};
