import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import { Key } from "ts-keycode-enum";
import { Priorities } from "@core/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { StyledTrashIcon } from "@web/components/Svg";
import { ColorNames } from "@web/common/types/styles";
import { SelectOption } from "@web/common/types/components";
import { getColor } from "@web/common/utils/colors";
import {
  HOURS_MINUTES_FORMAT,
  HOURS_AM_FORMAT,
  YEAR_MONTH_DAY_FORMAT,
} from "@web/common/constants/dates";

import { ComponentProps } from "./types";
import {
  Styled,
  StyledDescriptionField,
  StyledIconRow,
  StyledTitleField,
  StyledSubmitButton,
  StyledSubmitRow,
} from "./styled";
import { DateTimeSection } from "./DateTimeSection";
import { PrioritySection } from "./PrioritySection";

export const EventForm: React.FC<ComponentProps> = ({
  onClose: _onClose,
  onDelete,
  onSubmit,
  event,
  setEvent,
  ...props
}) => {
  const { priority, title } = event || {};

  /********
   * State
   ********/
  const [endTime, setEndTime] = useState<SelectOption<string> | undefined>();
  const [isShiftKeyPressed, toggleShiftKeyPressed] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [startTime, setStartTime] = useState<
    SelectOption<string> | undefined
  >();
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>();
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
    setEvent(event || {});
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
      isOpen={isFormOpen}
      priority={priority}
      onMouseUp={(e) => {
        if (isStartDatePickerOpen) {
          setIsStartDatePickerOpen(false);
        }
        if (isEndDatePickerOpen) {
          setIsEndDatePickerOpen(false);
        }

        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      role="form"
    >
      <StyledIconRow>
        <div onClick={onDeleteForm} role="button" title="Delete Event">
          <StyledTrashIcon hovercolor={getColor(ColorNames.DARK_5)} />
        </div>
      </StyledIconRow>

      <StyledTitleField
        autoFocus
        placeholder="Title"
        onKeyDown={submitFormWithKeyboard}
        value={title}
        onChange={onChangeEventTextField("title")}
      />

      <PrioritySection onSetEventField={onSetEventField} priority={priority} />

      <DateTimeSection
        endTime={endTime}
        isAllDay={event.isAllDay}
        isEndDatePickerShown={isEndDatePickerOpen}
        isStartDatePickerShown={isStartDatePickerOpen}
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
        placeholder="Description"
        value={event.description || ""}
      />

      <StyledSubmitRow>
        <StyledSubmitButton bordered={true} onClick={onSubmitForm}>
          Submit
        </StyledSubmitButton>
      </StyledSubmitRow>
    </Styled>
  );
};
