import dayjs from "dayjs";
import FocusTrap from "focus-trap-react";
import React, {
  KeyboardEvent,
  KeyboardEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Key } from "ts-key-enum";
import { Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { Trash } from "@phosphor-icons/react";
import IconButton from "@web/components/IconButton/IconButton";
import { getCategory } from "@web/common/utils/event.util";
import { SelectOption } from "@web/common/types/component.types";
import {
  getTimeOptionByValue,
  mapToBackend,
} from "@web/common/utils/web.date.util";
import { StyledMigrateArrowInForm } from "@web/views/Calendar/components/Sidebar/SomedayTab/SomedayEvents/styled";
import { ID_EVENT_FORM } from "@web/common/constants/web.constants";
import {
  colorByPriority,
  hoverColorByPriority,
} from "@web/common/styles/theme.util";

import { FormProps, SetEventFormField } from "./types";
import { DateTimeSection } from "./DateTimeSection/DateTimeSection";
import { PrioritySection } from "./PrioritySection";
import { SaveSection } from "./SaveSection";
import {
  StyledEventForm,
  StyledDescription,
  StyledIconRow,
  StyledTitle,
} from "./styled";

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
  const [selectedEndDate, setSelectedEndDate] = useState(new Date());
  const [selectedStartDate, setSelectedStartDate] = useState(new Date());

  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  /********
   * Effect
   *********/

  const keyDownHandler = useCallback(
    (e: globalThis.KeyboardEvent) => {
      if (e.key === Key.Shift) {
        setIsShiftKeyPressed(true);
      }

      if (e.key === Key.Escape) {
        setTimeout(_onClose);
        return;
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
    const getDefaultDateTimes = (event: Schema_Event) => {
      const start = event?.startDate ? dayjs(event.startDate) : dayjs();
      const startTime = getTimeOptionByValue(start);
      const startDate = start.toDate();

      const { endDate, endTime } = getDefaultEndDateTimes(event);

      return { startDate, startTime, endDate, endTime };
    };

    const dt = getDefaultDateTimes(event);

    setEvent(event || {});
    setStartTime(dt.startTime);
    setEndTime(dt.endTime);
    setSelectedStartDate(dt.startDate);
    setSelectedEndDate(dt.endDate);
    setIsFormOpen(true);
  }, [event, setEvent]);

  /***********
   * Helpers
   **********/

  const getDefaultEndDateTimes = (event: Schema_Event) => {
    const end = event?.endDate ? dayjs(event.endDate) : dayjs();
    const endTime = getTimeOptionByValue(end);

    if (event.isAllDay) {
      const isMultiDay = !dayjs(event.startDate).isSame(end);
      if (isMultiDay) {
        const userFriendlyEnd = end.add(-1, "day").toDate();

        return { endDate: userFriendlyEnd, endTime };
      }
    }

    return { endDate: end.toDate(), endTime };
  };

  /***********
   * Handlers
   **********/
  const onChangeEventTextField =
    (fieldName: "title" | "description") =>
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onSetEventField(fieldName, e.target.value);
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

  const ignoreDelete = (e: KeyboardEvent) => {
    if (e.key === Key.Backspace) {
      e.stopPropagation();
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

  const onSetEventField: SetEventFormField = (field, value) => {
    const newEvent = { ...event, [field]: value };
    setEvent(newEvent);
  };

  const onFormKeyDown: KeyboardEventHandler<HTMLFormElement> = (e) => {
    if (e.key === Key.Backspace || e.key == Key.Delete) {
      if (isDraft) {
        onClose();
        return;
      }

      const confirmed = window.confirm(
        `Delete ${event.title || "this event"}?`,
      );
      if (confirmed) {
        onDeleteForm();
        return;
      }
    }

    const shouldIgnore = isShiftKeyPressed || e.key !== Key.Enter;
    if (shouldIgnore) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    onSubmitForm();
  };

  return (
    <FocusTrap
      focusTrapOptions={{
        // To avoid conflicting with other events, like clicking outside closes the form
        allowOutsideClick: true,
      }}
    >
      <StyledEventForm
        {...props}
        isOpen={isFormOpen}
        name={ID_EVENT_FORM}
        onKeyDown={onFormKeyDown}
        onMouseUp={(e) => {
          e.stopPropagation();
          e.preventDefault();

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
            <StyledMigrateArrowInForm
              onClick={(e) => {
                e.stopPropagation();
                onConvert();
              }}
              role="button"
              title="Move to sidebar"
            >
              {"<"}
            </StyledMigrateArrowInForm>
          )}
          <IconButton onClick={onDeleteForm} aria-label="Delete Event">
            <Trash />
          </IconButton>
        </StyledIconRow>

        <StyledTitle
          autoFocus
          onChange={onChangeEventTextField("title")}
          onKeyDown={ignoreDelete}
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

        <DateTimeSection
          bgColor={priorityColor}
          event={event}
          category={category}
          endTime={endTime}
          inputColor={hoverColorByPriority[priority || Priorities.UNASSIGNED]}
          isEndDatePickerOpen={isEndDatePickerOpen}
          isStartDatePickerOpen={isStartDatePickerOpen}
          selectedEndDate={selectedEndDate}
          selectedStartDate={selectedStartDate}
          setEndTime={setEndTime}
          setSelectedEndDate={setSelectedEndDate}
          setSelectedStartDate={setSelectedStartDate}
          setStartTime={setStartTime}
          startTime={startTime}
          setIsEndDatePickerOpen={setIsEndDatePickerOpen}
          setIsStartDatePickerOpen={setIsStartDatePickerOpen}
          setEvent={setEvent}
        />

        <StyledDescription
          underlineColor={priorityColor}
          onChange={onChangeEventTextField("description")}
          onKeyDown={ignoreDelete}
          placeholder="Description"
          ref={descriptionRef}
          value={event.description || ""}
        />

        <SaveSection
          priority={priority || Priorities.UNASSIGNED}
          onSubmit={onSubmitForm}
        />
      </StyledEventForm>
    </FocusTrap>
  );
};
