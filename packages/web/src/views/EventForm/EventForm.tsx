import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import { Key } from "ts-keycode-enum";
import { Priorities } from "@core/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { Button } from "@web/components/Button";
import { JustifyContent } from "@web/components/Flex/styled";
import { SelectOption } from "@web/common/types/components";
import { colorNameByPriority } from "@web/common/styles/colors";
import {
  HOURS_MINUTES_FORMAT,
  HOURS_AM_FORMAT,
  YEAR_MONTH_DAY_FORMAT,
} from "@web/common/constants/dates";

import { ComponentProps } from "./types";
import { DateTimePickersSection } from "./DateTimePickersSection";
import {
  Styled,
  StyledTitleField,
  StyledPriorityFlex,
  StyledDescriptionField,
  StyledDeleteButton,
  StyledSubmitButton,
  StyledSubmitRow,
} from "./styled";

export const EventForm: React.FC<ComponentProps> = ({
  onClose: _onClose,
  onDelete,
  onSubmit,
  event,
  setEvent,
  ...props
}) => {
  const { priority, title, showStartTimeLabel } = event || {};

  /********
   * State
   ********/
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>();
  const [isShiftKeyPressed, toggleShiftKeyPressed] = useState(false);
  const [isOpen, setIsFormOpen] = useState(false); //rename to isFormOpen
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [startTime, setStartTime] = useState<
    SelectOption<string> | undefined
  >();
  const [endTime, setEndTime] = useState<SelectOption<string> | undefined>();
  const [selectedStartDate, setSelectedStartDate] = useState<
    Date | undefined
  >();

  /******************
   * Date Calculations
   ******************/
  const calculatedInitialStartTimeDayJs =
    event?.startDate && dayjs(event.startDate);
  const calculatedInitialEndTimeDayJs =
    event?.startDate && dayjs(event.endDate);

  const initialStartTime = calculatedInitialStartTimeDayJs && {
    value: calculatedInitialStartTimeDayJs.format(HOURS_MINUTES_FORMAT),
    label: calculatedInitialStartTimeDayJs.format(HOURS_AM_FORMAT),
  };

  const initialEndTime = calculatedInitialEndTimeDayJs && {
    value: calculatedInitialEndTimeDayJs.format(HOURS_MINUTES_FORMAT),
    label: calculatedInitialEndTimeDayJs.format(HOURS_AM_FORMAT),
  };

  const initialStartDate = event?.startDate
    ? dayjs(event?.startDate).toDate()
    : new Date();

  const initialEndDate = event?.endDate
    ? dayjs(event.endDate).toDate()
    : new Date();

  /********
   * Effect
   *********/
  useEffect(() => {
    setEvent(event || {}); //$$
    // setEvent(event || defaultEventState);
    setStartTime(initialStartTime || undefined);
    setEndTime(initialEndTime || undefined);
    setSelectedStartDate(initialStartDate);
    setSelectedEndDate(initialEndDate);

    const keyDownHandler = (e: KeyboardEvent) => {
      if (e.which === Key.Shift) {
        toggleShiftKeyPressed(true);
      }

      if (e.which !== Key.Escape) return;

      setTimeout(onClose);
    };

    const keyUpHandler = (e: KeyboardEvent) => {
      if (e.which === Key.Shift) {
        toggleShiftKeyPressed(false);
      }
    };

    document.addEventListener("keydown", keyDownHandler);
    document.addEventListener("keyup", keyUpHandler);

    setIsFormOpen(true);

    return () => {
      document.removeEventListener("keydown", keyDownHandler);
      document.removeEventListener("keyup", keyUpHandler);
    };
  }, []);

  /*********
   * Handlers
   **********/
  const onChangeEventTextField =
    (fieldName: "title" | "description") =>
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onSetEventField(fieldName, e.target.value);
    };

  const onClose = () => {
    setIsFormOpen(false);

    _onClose();
    setTimeout(() => {
      _onClose();
    }, 120);
  };

  const onDeleteForm = () => {
    onDelete(event._id);
    onClose();
  };

  const onFormClick = (e: MouseEvent) => {
    e.stopImmediatePropagation();
    return;
    // e.stopPropagation();
    // e.preventDefault();
  };

  const onDatePickerIsOpenChange = () => {
    console.log("changing date picker open state");
    setIsDatePickerOpen(!!isOpen);
  };

  const onSubmitForm = () => {
    const startDateString = dayjs(selectedStartDate).format(
      YEAR_MONTH_DAY_FORMAT
    );
    const endDateString = dayjs(selectedEndDate).format(YEAR_MONTH_DAY_FORMAT);

    const startDate = event?.isAllDay
      ? startDateString
      : `${startDateString} ${startTime?.value || ""}`;
    const endDate = event?.isAllDay
      ? endDateString
      : `${endDateString} ${endTime?.value || ""}`;

    const _event = { ...event };

    onSubmit({
      ..._event,
      priority: _event.priority || Priorities.UNASSIGNED,
      startDate,
      endDate,
      isTimeSelected: !!startTime,
    });

    onClose();
  };

  const onSetEventField = <FieldName extends keyof Schema_Event>(
    fieldName: FieldName,
    value: Schema_Event[FieldName]
  ) => {
    setEvent((_event) => ({
      ..._event,
      [fieldName]: value,
    }));
  };

  const submitFormWithKeyboard: React.KeyboardEventHandler<
    HTMLTextAreaElement
  > = (e) => {
    if (isShiftKeyPressed || e.which !== Key.Enter) return;

    e.preventDefault();
    e.stopPropagation();

    onSubmitForm();
  };

  return (
    <Styled
      {...props}
      isOpen={isOpen}
      priority={priority}
      onClick={(e) => {
        console.log("clicked somewhere in form");
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseUp={(e) => {
        console.log("stopping prop upon mouse");
        if (isDatePickerOpen) {
          console.log("trying to close date picker");
          onDatePickerIsOpenChange();
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      role="form"
      title="Event Form"
    >
      <StyledTitleField
        autoFocus
        placeholder="Title"
        onKeyDown={submitFormWithKeyboard}
        value={title}
        onChange={onChangeEventTextField("title")}
      />

      {!event.isAllDay && (
        <DateTimePickersSection
          isDatePickerShown={isDatePickerOpen}
          toggleDatePicker={onDatePickerIsOpenChange}
          setEndTime={setEndTime}
          setStartTime={setStartTime}
          setSelectedDate={setSelectedStartDate}
          endTime={endTime}
          startTime={startTime}
          selectedDate={selectedStartDate}
          showStartTimeLabel={!!showStartTimeLabel}
          setShowStartTimeLabel={(value) =>
            onSetEventField("showStartTimeLabel", !!value)
          }
        />
      )}

      <StyledPriorityFlex justifyContent={JustifyContent.SPACE_BETWEEN}>
        <Button
          bordered={priority === Priorities.WORK}
          color={colorNameByPriority.work}
          onClick={() => onSetEventField("priority", Priorities.WORK)}
          onFocus={() => onSetEventField("priority", Priorities.WORK)}
          role="tab"
          tabIndex={0}
        >
          Work
        </Button>

        <Button
          bordered={priority === Priorities.SELF}
          color={colorNameByPriority.self}
          onClick={() => onSetEventField("priority", Priorities.SELF)}
          onFocus={() => onSetEventField("priority", Priorities.SELF)}
          role="tab"
          tabIndex={0}
        >
          Self
        </Button>

        <Button
          bordered={priority === Priorities.RELATIONS}
          color={colorNameByPriority.relations}
          onClick={() => onSetEventField("priority", Priorities.RELATIONS)}
          onFocus={() => onSetEventField("priority", Priorities.RELATIONS)}
          role="tab"
          tabIndex={0}
        >
          Relationships
        </Button>
      </StyledPriorityFlex>

      <StyledDescriptionField
        onChange={onChangeEventTextField("description")}
        placeholder="Description"
        value={event.description || ""}
      />

      <StyledSubmitRow>
        <StyledSubmitButton bordered={true} onClick={onSubmitForm}>
          Submit
        </StyledSubmitButton>
        <StyledDeleteButton onClick={onDeleteForm}>Delete</StyledDeleteButton>
      </StyledSubmitRow>
    </Styled>
  );
};
