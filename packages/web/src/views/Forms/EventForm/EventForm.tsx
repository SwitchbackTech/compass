import classNames from "classnames";
import fastDeepEqual from "fast-deep-equal/react";
import type React from "react";
import {
  type KeyboardEvent,
  type SetStateAction,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Priorities } from "@core/constants/core.constants";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { ID_EVENT_FORM } from "@web/common/constants/web.constants";
import { darken } from "@web/common/styles/color.utils";
import {
  colorByPriority,
  hoverColorByPriority,
} from "@web/common/styles/theme.util";
import { type SelectOption } from "@web/common/types/component.types";
import { mapToBackend } from "@web/common/utils/datetime/web.date.util";
import {
  isComboboxInteraction,
  isDeleteTextEditingTarget,
} from "@web/common/utils/form/form.util";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import {
  Focusable,
  INPUT_RESET_CLASSNAME,
} from "@web/components/Focusable/Focusable";
import { Textarea } from "@web/components/Textarea/Textarea";
import { type GridEventDraft } from "@web/events/event-draft.types";
import {
  applySchemaEventPatchToGridDraft,
  gridEventDraftToSchemaEvent,
  replaceGridDraftSchedule,
} from "@web/events/grid-event-draft.adapter";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";
import { DateControlsSection } from "@web/views/Forms/EventForm/DateControlsSection/DateControlsSection/DateControlsSection";
import { getFormDates } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/form.datetime.util";
import { RecurrenceSection } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/RecurrenceSection";
import { EventActionMenu } from "@web/views/Forms/EventForm/EventActionMenu";
import { PrioritySection } from "@web/views/Forms/EventForm/PrioritySection";
import { SaveSection } from "@web/views/Forms/EventForm/SaveSection";
import { TitleActionsRow } from "@web/views/Forms/EventForm/TitleActionsRow";
import {
  type GridEventFormProps,
  type SetEventFormField,
} from "@web/views/Forms/EventForm/types";
import { EventFormShell } from "@web/views/Forms/EventFormShell";

const EVENT_FORM_PLAIN_HOTKEY_OPTIONS = {
  enabled: true,
  ignoreInputs: false,
} as const;

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

const handleEventFormDelete = ({
  isDraft,
  onClose,
  onDelete,
}: {
  isDraft: boolean;
  onClose: () => void;
  onDelete: () => void;
}) => {
  if (isDraft) {
    onClose();
    return;
  }

  onDelete();
};

export const EventForm: React.FC<Omit<GridEventFormProps, "category">> = memo(
  ({
    draft,
    onClose: _onClose,
    onConvert,
    onDelete,
    onSubmit,
    onDuplicate,
    setDraft,
    titleInputRef,
    isDraft,
    isExistingEvent,
    ...props
  }) => {
    // Schema_Event-shaped projection of the canonical draft, for the
    // still-unconverted DatePickers/PrioritySection field-patch API and
    // RecurrenceSection's Schema_Event contract — see
    // grid-event-draft.adapter.ts's gridEventDraftToSchemaEvent doc comment.
    const event = useMemo(() => gridEventDraftToSchemaEvent(draft), [draft]);
    const { title } = event;
    const priority = event.priority || Priorities.UNASSIGNED;
    const priorityColor = colorByPriority[priority];
    const category =
      draft.values.schedule.kind === "allDay"
        ? Categories_Event.ALLDAY
        : Categories_Event.TIMED;
    const latestDraftRef = useRef(draft);
    const eventStartDate = event.startDate as string;
    const eventEndDate = event.endDate as string;

    /********
     * State
     ********/
    const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
    const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
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

    const setLatestDraft = useCallback(
      (nextDraft: SetStateAction<GridEventDraft | null>) => {
        const resolvedDraft =
          typeof nextDraft === "function"
            ? nextDraft(latestDraftRef.current)
            : nextDraft;

        if (resolvedDraft) {
          latestDraftRef.current = resolvedDraft;
        }

        setDraft(resolvedDraft);
      },
      [setDraft],
    );

    // Schema_Event-shaped writer for the still-unconverted DatePickers/
    // PrioritySection field-patch API and RecurrenceSection's setEvent
    // contract: merges the patch onto the current draft's Schema_Event
    // projection, then reapplies it onto the canonical GridEventDraft.
    const setLatestEvent = useCallback(
      (nextEvent: SetStateAction<Schema_Event | null>) => {
        const currentEvent = gridEventDraftToSchemaEvent(latestDraftRef.current);
        const resolvedEvent =
          typeof nextEvent === "function"
            ? nextEvent(currentEvent)
            : nextEvent;

        if (!resolvedEvent) return;

        setLatestDraft(
          applySchemaEventPatchToGridDraft(
            latestDraftRef.current,
            resolvedEvent,
          ),
        );
      },
      [setLatestDraft],
    );

    useEffect(() => {
      latestDraftRef.current = draft;
    }, [draft]);

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

    const onClose = useCallback(() => {
      setTimeout(() => {
        _onClose();
      }, 1);
    }, [_onClose]);

    const onDeleteEvent = useCallback(() => {
      handleEventFormDelete({ isDraft, onClose, onDelete });
    }, [isDraft, onClose, onDelete]);

    const onDuplicateEvent = useCallback(() => {
      onDuplicate?.(draft);
      onClose();
    }, [onDuplicate, onClose, draft]);

    const handleIgnoredKeys = (e: KeyboardEvent) => {
      // Ignores certain keys and key combinations to prevent default behavior.
      // Allows some of them to be used as hotkeys

      if (e.key === "Backspace" || e.key === "Delete") {
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

    const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (
        isDraft &&
        !isExistingEvent &&
        e.key === "Enter" &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        e.preventDefault();
        e.stopPropagation();
        onSubmitForm();
        return;
      }

      handleIgnoredKeys(e);
    };

    const onSubmitForm = () => {
      const draftToSubmit = latestDraftRef.current;
      const isAllDay = draftToSubmit.values.schedule.kind === "allDay";
      const selectedDateTimes = {
        startDate: selectedStartDate,
        startTime,
        endDate: selectedEndDate,
        endTime,
        isAllDay,
      };

      const schedule = mapToBackend(selectedDateTimes);
      const start = dayjs(schedule.start).toDate();
      const end = dayjs(schedule.end).toDate();

      if (dayjs(start).isAfter(dayjs(end))) {
        showErrorToast(
          "uff-dah, looks like you got the start & end times mixed up",
        );
        return;
      }

      const withSchedule = replaceGridDraftSchedule(
        draftToSubmit,
        schedule.kind === "allDay"
          ? { kind: "allDay", start, end }
          : { kind: "timed", start, end, timeZone: schedule.timeZone },
      );

      const finalDraft: GridEventDraft = {
        ...withSchedule,
        values: {
          ...withSchedule.values,
          priority: withSchedule.values.priority || Priorities.UNASSIGNED,
        },
      } as GridEventDraft;

      onSubmit(finalDraft);
    };

    const onSetEventField: SetEventFormField = (field) => {
      setLatestEvent({
        ...gridEventDraftToSchemaEvent(latestDraftRef.current),
        ...field,
      });
    };

    const dateTimeSectionProps = {
      bgColor: priorityColor,
      displayEndDate,
      draft,
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
      setDraft: setLatestDraft,
    };

    const recurrenceSectionProps = {
      bgColor: priorityColor,
      event,
      setEvent: setLatestEvent,
    };

    useAppShortcut(
      "Delete",
      (keyboardEvent) => {
        if (isDeleteTextEditingTarget(keyboardEvent)) {
          return;
        }

        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        onDeleteEvent();
      },
      EVENT_FORM_PLAIN_HOTKEY_OPTIONS,
    );

    useAppShortcut(
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

    useAppShortcut(
      "Mod+D",
      (keyboardEvent) => {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        onDuplicate?.(draft);
      },
      EVENT_FORM_PLAIN_HOTKEY_OPTIONS,
    );

    useAppShortcut(
      "Mod+Enter",
      (e) => {
        e.preventDefault();
        onSubmitForm();
      },
      {
        enabled: true,
      },
    );

    return (
      <EventFormShell
        {...props}
        priority={priority}
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
      >
        <TitleActionsRow
          title={
            <Focusable
              Component="input"
              className={classNames(
                INPUT_RESET_CLASSNAME,
                "bg-transparent font-semibold text-2xl transition-all duration-300",
              )}
              autoFocus
              onChange={onChangeEventTextField("title")}
              onKeyDown={handleTitleKeyDown}
              placeholder="Title"
              name="Event Title"
              ref={titleInputRef}
              underlineColor={priorityColor}
              value={title ?? ""}
              withUnderline
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
              onDelete={onDeleteEvent}
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
      </EventFormShell>
    );
  },
  fastDeepEqual,
);

EventForm.displayName = "EventForm";
