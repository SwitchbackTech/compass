import dayjs from "dayjs";
import React, {
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
import { useFormKeyboardSubmit } from "../hooks/useFormKeyboardSubmit";
import { getFormDates } from "./DateControlsSection/DateTimeSection/form.datetime.util";
import { PrioritySection } from "./PrioritySection";
import { SaveSection } from "./SaveSection";
// Import the custom hook
import {
  StyledDescription,
  StyledEventForm,
  StyledIconRow,
  StyledTitle,
} from "./styled";
import { FormProps, SetEventFormField } from "./types";

// Updated hotkeys options - removed "button" to fix TypeScript error
const hotkeysOptions: OptionsOrDependencyArray = {
  enableOnFormTags: ["input", "textarea"],
};

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

  // Create a safe priority that defaults to UNASSIGNED if undefined
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

  // Move onSetEventField here, before the callbacks that use it
  const onSetEventField: SetEventFormField = (field) => {
    setEvent({ ...event, ...field });
  };

  const onChangeEventTextField =
    (fieldName: "title" | "description") =>
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onSetEventField({ [fieldName]: e.target.value });
    };

  // Split handlers by input type
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
      priority: event.priority || Priorities.UNASSIGNED,
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
    onSubmit,
    onClose,
  ]);

  // Updated handleIgnoredKeys function - no longer handles META+ENTER
  const handleIgnoredKeys = useCallback((e: KeyboardEvent) => {
    // Ignores certain keys and key combinations to prevent default behavior.
    // Allows some of them to be used as hotkeys

    if (e.key === Key.Backspace) {
      e.stopPropagation();
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "<") {
      e.preventDefault();
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
      e.preventDefault();
    }

    // Don't handle META+ENTER here anymore - it's handled by useFormKeyboardSubmit
    // But we can still prevent other unwanted key combinations if needed
  }, []);

  const dateTimeSectionProps = {
    bgColor: priorityColor,
    displayEndDate,
    event,
    category,
    endTime,
    inputColor: hoverColorByPriority[safePriority], // Updated
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

  // REMOVED: Conflicting useHotkeys("enter", ...) call
  // This is now handled by useFormKeyboardSubmit hook

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
      onMouseDown={(e) => e.stopPropagation()}
      priority={safePriority} // Updated to use safePriority
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
        onChange={onChangeTextField("title")} // Use input handler
        onKeyDown={handleIgnoredKeys}
        placeholder="Title"
        role="textarea"
        name="Event Title"
        underlineColor={priorityColor}
        value={title}
      />

      <PrioritySection
        onSetEventField={onSetEventField}
        priority={safePriority} // Updated
      />

      <DateControlsSection
        dateTimeSectionProps={dateTimeSectionProps}
        eventCategory={category}
        recurrenceSectionProps={recurrenceSectionProps}
      />

      <StyledDescription
        underlineColor={priorityColor}
        onChange={onChangeTextArea("description")} // Use textarea handler
        onKeyDown={handleIgnoredKeys}
        placeholder="Description"
        ref={descriptionRef}
        value={event.description || ""}
      />

      <SaveSection
        priority={safePriority} // Updated
        onSubmit={onSubmitForm}
      />
    </StyledEventForm>
  );
};
