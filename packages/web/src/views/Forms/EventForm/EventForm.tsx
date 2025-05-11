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

const hotkeysOptions: OptionsOrDependencyArray = {
  enableOnFormTags: ["input"],
};

export const EventForm: React.FC<FormProps> = ({
  event,
  onClose: _onClose,
  onConvert,
  onDelete,
  onSubmit,
  setEvent,
  ...props
}) => {
  const { priority, title } = event || {};
  const priorityColor = colorByPriority[priority || Priorities.UNASSIGNED];
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
      window.addEventListener("keyup", keyUpHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  /***********
   * Handlers
   **********/
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

  const handleIgnoredKeys = (e: KeyboardEvent) => {
    if (e.key === Key.Backspace) {
      e.stopPropagation();
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "<") {
      e.preventDefault();
    }

    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmitForm();
    }
  };

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
    "enter",
    () => {
      onSubmitForm();
    },
    hotkeysOptions,
  );

  return (
    <StyledEventForm
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
      priority={priority}
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
        onChange={onChangeEventTextField("title")}
        onKeyDown={handleIgnoredKeys}
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
        onKeyDown={handleIgnoredKeys}
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
