import dayjs from "dayjs";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { OptionsOrDependencyArray } from "react-hotkeys-hook/dist/types";
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
import { getFormDates } from "../EventForm/DateControlsSection/DateTimeSection/form.datetime.util";
import { PrioritySection } from "../EventForm/PrioritySection";
import { SaveSection } from "../EventForm/SaveSection";
import {
  StyledDescription,
  StyledEventForm,
  StyledIconRow,
  StyledTitle,
} from "../EventForm/styled";
import { FormProps, SetEventFormField } from "../EventForm/types";
// Import the correct hook - adjust path as needed
import { useFormKeyboardSubmit } from "../hooks/useFormKeyboardSubmit";

// Fixed hotkeys options - removed "button" as it's not a valid FormTag
const hotkeysOptions: OptionsOrDependencyArray = {
  enableOnFormTags: ["input", "textarea"], // "button" is not a valid FormTag
};

export const SomedayEventForm: React.FC<FormProps> = ({
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

  // Provide fallback for priority to prevent undefined index errors
  const safePriority = priority || Priorities.UNASSIGNED;
  const priorityColor = colorByPriority[safePriority];
  const category = getCategory(event);
  const isDraft = !event._id;

  /********
   * State
   ********/
  const [endTime, setEndTime] = useState<SelectOption<string>>({
    label: "1 AM",
    value: "01:00 AM",
  });
  const [isShiftKeyPressed, setIsShiftKeyPressed] = useState(false);
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

  /***********
   * Handlers
   **********/

  // Move onSetEventField here, before other handlers that use it
  const onSetEventField: SetEventFormField = (field) => {
    setEvent({ ...event, ...field });
  };

  // Separate handlers for different input types
  const onChangeTextField = useCallback(
    (fieldName: "title") => (e: React.ChangeEvent<HTMLInputElement>) => {
      onSetEventField({ [fieldName]: e.target.value });
    },
    [onSetEventField],
  );

  const onChangeTextArea = useCallback(
    (fieldName: "description") =>
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onSetEventField({ [fieldName]: e.target.value });
      },
    [onSetEventField],
  );

  /*********
   * Effects
   *********/
  const keyDownHandler = useCallback(
    (e: globalThis.KeyboardEvent) => {
      if (e.key === Key.Shift) {
        setIsShiftKeyPressed(true);
      }
    },
    [_onClose],
  );

  const keyUpHandler = useCallback((e: globalThis.KeyboardEvent) => {
    if (e.key === Key.Shift) {
      setIsShiftKeyPressed(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", keyDownHandler);
    window.addEventListener("keyup", keyUpHandler);

    return () => {
      window.removeEventListener("keydown", keyDownHandler);
      window.removeEventListener("keyup", keyUpHandler);
    };
  }, [keyDownHandler, keyUpHandler]);

  useEffect(() => {
    setEvent(event || {});

    // Safe check for event.recurrence.rule.length
    const hasRecurrence =
      event?.recurrence?.rule && event.recurrence.rule.length > 0;

    const dt = getFormDates(event.startDate as string, event.endDate as string);
    setStartTime(dt.startTime);
    setSelectedStartDate(dt.startDate);
    setDisplayEndDate(dayjs(dt.displayEndDate).toDate());
    setEndTime(dt.endTime);
    setSelectedEndDate(dt.endDate);

    setIsFormOpen(true);
  }, [event, setEvent]);

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

  const onSubmitForm = useCallback(() => {
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
      priority: safePriority, // Use safe priority
      startDate,
      endDate,
    };

    onSubmit(finalEvent);
    onClose();
  }, [
    selectedStartDate,
    startTime,
    selectedEndDate,
    endTime,
    event,
    safePriority,
    onSubmit,
    onClose,
  ]);

  const handleIgnoredKeys = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      // Ignores certain keys and key combinations to prevent default behavior
      // and allows hotkeys to work properly

      if (e.key === Key.Backspace) {
        e.stopPropagation();
        return;
      }

      // Handle meta/ctrl key combinations
      if (e.metaKey || e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case "<":
          case "d":
            e.preventDefault();
            break;
        }
      }
    },
    [],
  );

  const dateTimeSectionProps = {
    bgColor: priorityColor,
    displayEndDate,
    event,
    category,
    endTime,
    inputColor: hoverColorByPriority[safePriority], // Use safe priority
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

  // Use the custom hook for form keyboard submission
  useFormKeyboardSubmit({
    onSubmit: onSubmitForm,
    isFormOpen,
    formRef,
  });

  /***********
   * Hotkeys
   **********/
  useHotkeys(
    "meta+shift+comma",
    () => {
      if (isDraft) {
        return;
      }

      onConvert?.();
    },
    hotkeysOptions,
  );

  useHotkeys(
    "delete",
    () => {
      if (isDraft) {
        onClose();
        return;
      }

      const confirmed = window.confirm(
        `Delete ${event.title || "this event"}?`,
      );

      if (confirmed) {
        onDeleteForm();
      }
    },
    hotkeysOptions,
  );

  useHotkeys(
    "meta+d",
    () => {
      onDuplicate?.(event);
    },
    hotkeysOptions,
  );

  return (
    <StyledEventForm
      ref={formRef}
      {...props}
      isOpen={isFormOpen}
      name={ID_EVENT_FORM}
      onMouseUp={() => {
        if (isStartDatePickerOpen) {
          setIsStartDatePickerOpen(false);
        }

        if (isEndDatePickerOpen) {
          setIsEndDatePickerOpen(false);
        }
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      priority={safePriority} // Use safe priority - now guaranteed to be a string
      role="form"
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
        onChange={onChangeTextField("title")} // Use input handler for title
        onKeyDown={handleIgnoredKeys}
        placeholder="Title"
        role="textarea"
        name="Event Title"
        underlineColor={priorityColor}
        value={title}
      />

      <PrioritySection
        onSetEventField={onSetEventField}
        priority={safePriority} // Use safe priority - guaranteed to be defined
      />

      <DateControlsSection
        dateTimeSectionProps={dateTimeSectionProps}
        eventCategory={category}
        recurrenceSectionProps={recurrenceSectionProps}
      />

      <StyledDescription
        underlineColor={priorityColor}
        onChange={onChangeTextArea("description")} // Use textarea handler for description
        onKeyDown={handleIgnoredKeys}
        placeholder="Description"
        ref={descriptionRef}
        value={event.description || ""}
      />

      <SaveSection
        priority={safePriority} // Use safe priority - guaranteed to be defined
        onSubmit={onSubmitForm}
      />
    </StyledEventForm>
  );
};
