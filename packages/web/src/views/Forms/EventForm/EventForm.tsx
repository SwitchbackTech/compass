import fastDeepEqual from "fast-deep-equal/react";
import React, {
  KeyboardEvent,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { OptionsOrDependencyArray } from "react-hotkeys-hook/dist/types";
import { Key } from "ts-key-enum";
import { Priorities } from "@core/constants/core.constants";
import { darken } from "@core/util/color.utils";
import dayjs from "@core/util/date/dayjs";
import { ID_EVENT_FORM } from "@web/common/constants/web.constants";
import {
  colorByPriority,
  hoverColorByPriority,
} from "@web/common/styles/theme.util";
import { SelectOption } from "@web/common/types/component.types";
import { mapToBackend } from "@web/common/utils/datetime/web.date.util";
import { getCategory } from "@web/common/utils/event/event.util";
import { isComboboxInteraction } from "@web/common/utils/form/form.util";
import { DateControlsSection } from "@web/views/Forms/EventForm/DateControlsSection/DateControlsSection/DateControlsSection";
import { getFormDates } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/form.datetime.util";
import { RecurrenceSection } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/RecurrenceSection";
import { EventActionMenu } from "@web/views/Forms/EventForm/EventActionMenu";
import { PrioritySection } from "@web/views/Forms/EventForm/PrioritySection";
import { SaveSection } from "@web/views/Forms/EventForm/SaveSection";
import {
  StyledDescription,
  StyledEventForm,
  StyledIconRow,
  StyledTitle,
} from "@web/views/Forms/EventForm/styled";
import { FormProps, SetEventFormField } from "@web/views/Forms/EventForm/types";

const hotkeysOptions: OptionsOrDependencyArray = {
  enableOnFormTags: ["input"],
};

export const EventForm: React.FC<Omit<FormProps, "category">> = memo(
  ({
    event,
    onClose: _onClose,
    onConvert,
    onDelete,
    onSubmit,
    onDuplicate,
    setEvent,
    isDraft,
    isExistingEvent,
    ...props
  }) => {
    const { title } = event || {};
    const priority = event.priority || Priorities.UNASSIGNED;
    const priorityColor = colorByPriority[priority];
    const category = getCategory(event);

    /********
     * State
     ********/
    const [endTime, setEndTime] = useState<SelectOption<string>>({
      label: "1 AM",
      value: "01:00 AM",
    });
    const [_isShiftKeyPressed, setIsShiftKeyPressed] = useState(false);
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
        window.removeEventListener("keyup", keyUpHandler);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      setEvent(event || {});

      const dt = getFormDates(
        event.startDate as string,
        event.endDate as string,
      );
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
      <T extends HTMLInputElement | HTMLTextAreaElement = HTMLTextAreaElement>(
        e: React.ChangeEvent<T>,
      ) => {
        onSetEventField({ [fieldName]: e.target.value });
      };

    const onClose = () => {
      setIsFormOpen(false);

      setTimeout(() => {
        _onClose();
      }, 1);
    };

    const onDuplicateEvent = useCallback(() => {
      onDuplicate?.(event);
      onClose();
    }, [onDuplicate, onClose]);

    const handleIgnoredKeys = (e: KeyboardEvent) => {
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

      if ((e.metaKey || e.ctrlKey) && e.key === Key.Enter) {
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
      inputColor: hoverColorByPriority[priority],
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
      setEvent,
    };

    useHotkeys(
      "delete",
      () => {
        if (isDraft) {
          onClose();
          return;
        }

        onDelete();
      },
      hotkeysOptions,
      [onDelete],
    );

    useHotkeys(
      "enter",
      (keyboardEvent) => {
        if (isComboboxInteraction(keyboardEvent)) {
          return;
        }

        onSubmitForm();
      },
      hotkeysOptions,
      [onSubmitForm],
    );

    useHotkeys(
      "meta+d",
      () => {
        onDuplicate?.(event);
      },
      hotkeysOptions,
    );

    useHotkeys(
      "mod+enter",
      (e) => {
        e.preventDefault();
        onSubmitForm();
      },
      {
        enabled: isFormOpen,
        enableOnFormTags: true,
      },
      [isFormOpen, onSubmitForm],
    );

    useHotkeys(
      "ctrl+meta+left",
      () => {
        if (isDraft) {
          return;
        }

        onConvert?.();
      },
      {
        enabled: isFormOpen,
        enableOnFormTags: true,
      },
      [isFormOpen],
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
          <EventActionMenu
            bgColor={darken(priorityColor)}
            isDraft={isDraft}
            isExistingEvent={isExistingEvent}
            onConvert={() => {
              onConvert?.();
            }}
            onDuplicate={onDuplicateEvent}
            onDelete={onDelete}
          />
        </StyledIconRow>

        <StyledTitle
          autoFocus
          onChange={onChangeEventTextField("title")}
          onKeyDown={handleIgnoredKeys}
          placeholder="Title"
          role="textarea"
          name="Event Title"
          underlineColor={priorityColor}
          value={title ?? ""}
        />

        <PrioritySection
          onSetEventField={onSetEventField}
          priority={priority}
        />

        <DateControlsSection
          dateTimeSectionProps={dateTimeSectionProps}
          eventCategory={category}
        />

        <RecurrenceSection {...recurrenceSectionProps} />

        <StyledDescription
          underlineColor={priorityColor}
          onChange={onChangeEventTextField("description")}
          onKeyDown={handleIgnoredKeys}
          placeholder="Description"
          ref={descriptionRef}
          value={event.description || ""}
          className="overflow-y-auto"
        />

        <SaveSection priority={priority} onSubmit={onSubmitForm} />
      </StyledEventForm>
    );
  },
  fastDeepEqual,
);

EventForm.displayName = "EventForm";
