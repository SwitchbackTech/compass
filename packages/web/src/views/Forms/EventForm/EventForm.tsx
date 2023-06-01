import dayjs from "dayjs";
import React, {
  KeyboardEvent,
  KeyboardEventHandler,
  useCallback,
  useEffect,
  useState,
} from "react";
import { Key } from "ts-key-enum";
import { getColor } from "@core/util/color.utils";
import { Priorities } from "@core/constants/core.constants";
import { colorNameByPriority } from "@core/constants/colors";
import { Schema_Event } from "@core/types/event.types";
import { DeleteIcon } from "@web/components/Icons";
import { getCategory } from "@web/common/utils/event.util";
import { SelectOption } from "@web/common/types/component.types";
import {
  getTimeOptionByValue,
  mapToBackend,
} from "@web/common/utils/web.date.util";
import { StyledMigrateArrowInForm } from "@web/views/Calendar/components/LeftSidebar/SomedaySection/SomedayEvents/styled";

import { FormProps, SetEventFormField } from "./types";
import { DateTimeSection } from "./DateTimeSection";
import { PrioritySection } from "./PrioritySection";
import { SaveSection } from "./SaveSection";
import {
  StyledEventForm,
  StyledDescriptionField,
  StyledIconRow,
  StyledTitleField,
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
  const category = getCategory(event);
  const isDraft = !event._id;

  /********
   * State
   ********/
  const [endTime, setEndTime] = useState<SelectOption<string> | undefined>();
  const [isShiftKeyPressed, setIsShiftKeyPressed] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [startTime, setStartTime] = useState<SelectOption<string>>();
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>();
  const [selectedStartDate, setSelectedStartDate] = useState<
    Date | undefined
  >();

  /********
   * Effect
   *********/

  const keyDownHandler = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === Key.Shift) {
        setIsShiftKeyPressed(true);
      }

      if (e.key === Key.Escape) {
        setTimeout(_onClose);
        return;
      }
    },
    [_onClose]
  );

  const keyUpHandler = useCallback((e: KeyboardEvent) => {
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
    onDelete(event._id);
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
      isAllDay: event.isAllDay,
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
        `Delete ${event.title || "this event"}?`
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
    <StyledEventForm
      {...props}
      isOpen={isFormOpen}
      name="Event Form"
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
        <DeleteIcon onDelete={onDeleteForm} title="Delete Event" />
      </StyledIconRow>

      <StyledTitleField
        autoFocus
        onChange={onChangeEventTextField("title")}
        onKeyDown={ignoreDelete}
        placeholder="Title"
        role="textarea"
        name="Event Title"
        value={title}
      />

      <PrioritySection onSetEventField={onSetEventField} priority={priority} />

      <DateTimeSection
        bgColor={getColor(colorNameByPriority[priority])}
        category={category}
        endTime={endTime}
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
      />

      <StyledDescriptionField
        onChange={onChangeEventTextField("description")}
        onKeyDown={ignoreDelete}
        placeholder="Description"
        value={event.description || ""}
      />

      <SaveSection priority={priority} onSubmit={onSubmitForm} />
    </StyledEventForm>
  );
};
