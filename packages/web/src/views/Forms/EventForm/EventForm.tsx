import fastDeepEqual from "fast-deep-equal/react";
import type React from "react";
import {
  type KeyboardEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Priorities } from "@core/constants/core.constants";
import { darken } from "@core/util/color.utils";
import dayjs from "@core/util/date/dayjs";
import { ID_EVENT_FORM } from "@web/common/constants/web.constants";
import { useAppHotkey } from "@web/common/hooks/useAppHotkey";
import { type CSSVariables } from "@web/common/styles/css.types";
import {
  colorByPriority,
  hoverColorByPriority,
} from "@web/common/styles/theme.util";
import { type SelectOption } from "@web/common/types/component.types";
import { mapToBackend } from "@web/common/utils/datetime/web.date.util";
import { getCategory } from "@web/common/utils/event/event.util";
import { isComboboxInteraction } from "@web/common/utils/form/form.util";
import { Input } from "@web/components/Input/Input";
import { Textarea } from "@web/components/Textarea/Textarea";
import { DateControlsSection } from "@web/views/Forms/EventForm/DateControlsSection/DateControlsSection/DateControlsSection";
import { getFormDates } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/form.datetime.util";
import { RecurrenceSection } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/RecurrenceSection";
import { EventActionMenu } from "@web/views/Forms/EventForm/EventActionMenu";
import { PrioritySection } from "@web/views/Forms/EventForm/PrioritySection";
import { SaveSection } from "@web/views/Forms/EventForm/SaveSection";
import { TitleActionsRow } from "@web/views/Forms/EventForm/TitleActionsRow";
import {
  type FormProps,
  type SetEventFormField,
} from "@web/views/Forms/EventForm/types";

const EVENT_FORM_PLAIN_HOTKEY_OPTIONS = {
  enabled: true,
  ignoreInputs: false,
} as const;
const DRAFT_TITLE_MOVEMENT_KEYS = new Set([
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
]);

type TitleEditingResetKey = string | number | null | undefined;

interface TitleEditingState {
  isStarted: boolean;
  resetKey: TitleEditingResetKey;
}

interface EventFormDateTimeState {
  displayEndDate: Date;
  endTime: SelectOption<string>;
  selectedEndDate: Date;
  selectedStartDate: Date;
  sourceEndDate: string;
  sourceStartDate: string;
  startTime: SelectOption<string>;
}

const createDateTimeState = (
  sourceStartDate: string,
  sourceEndDate: string,
): EventFormDateTimeState => {
  const dt = getFormDates(sourceStartDate, sourceEndDate);

  return {
    displayEndDate: dayjs(dt.displayEndDate).toDate(),
    endTime: dt.endTime,
    selectedEndDate: dt.endDate,
    selectedStartDate: dt.startDate,
    sourceEndDate,
    sourceStartDate,
    startTime: dt.startTime,
  };
};

const resolveDateTimeState = (
  state: EventFormDateTimeState,
  sourceStartDate: string,
  sourceEndDate: string,
) => {
  if (
    state.sourceStartDate === sourceStartDate &&
    state.sourceEndDate === sourceEndDate
  ) {
    return state;
  }

  return createDateTimeState(sourceStartDate, sourceEndDate);
};

export const EventForm: React.FC<Omit<FormProps, "category">> = memo(
  ({
    event,
    onClose: _onClose,
    onConvert,
    onDelete,
    onSubmit,
    onDuplicate,
    onDraftTitleArrowKey,
    setEvent,
    titleEditingResetKey,
    titleInputRef,
    isDraft,
    isExistingEvent,
    ...props
  }) => {
    const { title } = event || {};
    const priority = event.priority || Priorities.UNASSIGNED;
    const priorityColor = colorByPriority[priority];
    const category = getCategory(event);
    const latestEventRef = useRef(event);
    const currentTitleEditingResetKey = titleEditingResetKey ?? event._id;
    const eventStartDate = event.startDate as string;
    const eventEndDate = event.endDate as string;

    /********
     * State
     ********/
    const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
    const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
    const [titleEditingState, setTitleEditingState] =
      useState<TitleEditingState>({
        isStarted: false,
        resetKey: currentTitleEditingResetKey,
      });
    const [dateTimeState, setDateTimeState] = useState<EventFormDateTimeState>(
      () => createDateTimeState(eventStartDate, eventEndDate),
    );

    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const currentDateTimeState = useMemo(
      () => resolveDateTimeState(dateTimeState, eventStartDate, eventEndDate),
      [dateTimeState, eventEndDate, eventStartDate],
    );
    const {
      displayEndDate,
      endTime,
      selectedEndDate,
      selectedStartDate,
      startTime,
    } = currentDateTimeState;
    const isTitleEditingStarted =
      titleEditingState.resetKey === currentTitleEditingResetKey &&
      titleEditingState.isStarted;

    const setIsTitleEditingStarted = useCallback(
      (isStarted: boolean) => {
        setTitleEditingState((state) => {
          if (
            state.isStarted === isStarted &&
            state.resetKey === currentTitleEditingResetKey
          ) {
            return state;
          }

          return {
            isStarted,
            resetKey: currentTitleEditingResetKey,
          };
        });
      },
      [currentTitleEditingResetKey],
    );

    const updateDateTimeState = useCallback(
      (
        field: Partial<
          Omit<EventFormDateTimeState, "sourceStartDate" | "sourceEndDate">
        >,
      ) => {
        setDateTimeState((state) => {
          const resolvedState = resolveDateTimeState(
            state,
            eventStartDate,
            eventEndDate,
          );
          const nextState = { ...resolvedState, ...field };

          if (fastDeepEqual(nextState, state)) {
            return state;
          }

          if (fastDeepEqual(nextState, resolvedState)) {
            return resolvedState;
          }

          return nextState;
        });
      },
      [eventEndDate, eventStartDate],
    );

    const setStartTime = useCallback(
      (value: SelectOption<string>) =>
        updateDateTimeState({ startTime: value }),
      [updateDateTimeState],
    );
    const setEndTime = useCallback(
      (value: SelectOption<string>) => updateDateTimeState({ endTime: value }),
      [updateDateTimeState],
    );
    const setSelectedStartDate = useCallback(
      (value: Date) => updateDateTimeState({ selectedStartDate: value }),
      [updateDateTimeState],
    );
    const setSelectedEndDate = useCallback(
      (value: Date) => updateDateTimeState({ selectedEndDate: value }),
      [updateDateTimeState],
    );
    const setDisplayEndDate = useCallback(
      (value: Date) => updateDateTimeState({ displayEndDate: value }),
      [updateDateTimeState],
    );

    const setLatestEvent = useCallback(
      (nextEvent: Parameters<typeof setEvent>[0]) => {
        const resolvedEvent =
          typeof nextEvent === "function"
            ? nextEvent(latestEventRef.current)
            : nextEvent;

        if (resolvedEvent) {
          latestEventRef.current = resolvedEvent;
        }

        setEvent(resolvedEvent);
      },
      [setEvent],
    );

    useEffect(() => {
      latestEventRef.current = event;
    }, [event]);

    /***********
     * Handlers
     **********/
    const onChangeEventTextField =
      (fieldName: "title" | "description") =>
      <T extends HTMLInputElement | HTMLTextAreaElement = HTMLTextAreaElement>(
        e: React.ChangeEvent<T>,
      ) => {
        if (fieldName === "title" && !isTitleEditingStarted) {
          setIsTitleEditingStarted(true);
        }

        onSetEventField({ [fieldName]: e.target.value });
      };

    const onClose = useCallback(() => {
      setTimeout(() => {
        _onClose();
      }, 1);
    }, [_onClose]);

    const onDuplicateEvent = useCallback(() => {
      onDuplicate?.(event);
      onClose();
    }, [onDuplicate, onClose, event]);

    const handleIgnoredKeys = (e: KeyboardEvent) => {
      // Ignores certain keys and key combinations to prevent default behavior.
      // Allows some of them to be used as hotkeys

      if (e.key === "Backspace") {
        e.stopPropagation();
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "<") {
        e.preventDefault();
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onSubmitForm();
      }
    };

    const handleDraftTitleArrowKey = (e: KeyboardEvent<HTMLInputElement>) => {
      if (
        !onDraftTitleArrowKey ||
        (!isDraft && !isExistingEvent) ||
        isTitleEditingStarted ||
        !DRAFT_TITLE_MOVEMENT_KEYS.has(e.key)
      ) {
        return false;
      }

      const didMove = onDraftTitleArrowKey(e.key);
      if (!didMove) return false;

      e.preventDefault();
      e.stopPropagation();
      return true;
    };

    const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (handleDraftTitleArrowKey(e)) {
        return;
      }

      if (
        isDraft &&
        !isExistingEvent &&
        e.key === "Enter" &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        e.preventDefault();
        e.stopPropagation();
        setIsTitleEditingStarted(false);
        onSubmitForm();
        return;
      }

      handleIgnoredKeys(e);
    };

    const onSubmitForm = () => {
      const eventToSubmit = latestEventRef.current;
      const selectedDateTimes = {
        startDate: selectedStartDate,
        startTime,
        endDate: selectedEndDate,
        endTime,
        isAllDay: eventToSubmit.isAllDay || false,
      };

      const { startDate, endDate } = mapToBackend(selectedDateTimes);

      if (dayjs(startDate).isAfter(dayjs(endDate))) {
        alert("uff-dah, looks like you got the start & end times mixed up");
        return;
      }

      const finalEvent = {
        ...eventToSubmit,
        priority: eventToSubmit.priority || Priorities.UNASSIGNED,
        startDate,
        endDate,
      };

      onSubmit(finalEvent);
    };

    const onSetEventField: SetEventFormField = (field) => {
      setLatestEvent({ ...latestEventRef.current, ...field });
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
      setEvent: setLatestEvent,
    };

    const recurrenceSectionProps = {
      bgColor: priorityColor,
      event,
      setEvent: setLatestEvent,
    };

    useAppHotkey(
      "Delete",
      () => {
        if (isDraft) {
          onClose();
          return;
        }

        onDelete();
      },
      EVENT_FORM_PLAIN_HOTKEY_OPTIONS,
    );

    useAppHotkey(
      "Enter",
      (keyboardEvent) => {
        if (isDraft) {
          return;
        }

        if (isComboboxInteraction(keyboardEvent)) {
          return;
        }

        onSubmitForm();
      },
      EVENT_FORM_PLAIN_HOTKEY_OPTIONS,
    );

    useAppHotkey(
      "Mod+D",
      (keyboardEvent) => {
        keyboardEvent.preventDefault();
        onDuplicate?.(event);
      },
      EVENT_FORM_PLAIN_HOTKEY_OPTIONS,
    );

    useAppHotkey(
      "Mod+Enter",
      (e) => {
        e.preventDefault();
        onSubmitForm();
      },
      {
        enabled: true,
      },
    );

    useAppHotkey(
      "Control+Meta+ArrowLeft",
      () => {
        if (isDraft) {
          return;
        }

        onConvert?.();
      },
      {
        enabled: true,
      },
    );

    return (
      <form
        {...props}
        role="form"
        className="z-1 rounded-sm bg-(--event-form-bg) px-5 py-4.5 shadow-[0_5px_5px_var(--color-shadow-default)] transition-all duration-300"
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
        style={
          { "--event-form-bg": hoverColorByPriority[priority] } as CSSVariables
        }
      >
        <TitleActionsRow
          title={
            <Input
              className="bg-transparent font-semibold text-2xl transition-all duration-300 hover:bg-border-primary"
              autoFocus
              onChange={onChangeEventTextField("title")}
              onKeyDown={handleTitleKeyDown}
              onPointerDown={() => setIsTitleEditingStarted(true)}
              placeholder="Title"
              name="Event Title"
              ref={titleInputRef}
              underlineColor={priorityColor}
              value={title ?? ""}
            />
          }
          actions={
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
          }
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

        <Textarea
          underlineColor={priorityColor}
          onChange={onChangeEventTextField("description")}
          onKeyDown={handleIgnoredKeys}
          placeholder="Description"
          ref={descriptionRef}
          value={event.description || ""}
          className="relative max-h-45 w-full overflow-y-auto border-hidden bg-transparent transition-all duration-300 hover:bg-border-primary hover:brightness-90"
        />

        <SaveSection priority={priority} onSubmit={onSubmitForm} />
      </form>
    );
  },
  fastDeepEqual,
);

EventForm.displayName = "EventForm";
