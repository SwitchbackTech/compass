import classNames from "classnames";
import fastDeepEqual from "fast-deep-equal/react";
import type React from "react";
import {
  type KeyboardEvent,
  memo,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Priorities } from "@core/constants/core.constants";
import { type CalendarId } from "@core/types/domain-primitives";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import {
  isEventReadOnly,
  useCalendarLookup,
} from "@web/calendars/useCalendarLookup";
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
import { BUSY_EVENT_TITLE } from "@web/events/queries/event.view-model";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";
import { CalendarSelect } from "@web/views/Forms/EventForm/CalendarSelect/CalendarSelect";
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
import { useEscapeToCloseForm } from "@web/views/Forms/hooks/useEscapeToCloseForm";

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
    // A6: an existing event's calendar is display-only here, never a move
    // control - draft.source.calendarId is the only calendar an edit draft
    // can show.
    const calendarLookup = useCalendarLookup();
    const originalCalendarName =
      draft.kind === "edit"
        ? (calendarLookup.get(draft.source.calendarId)?.name ??
          "Unknown calendar")
        : null;
    // Only an "edit" draft can be read-only - CalendarSelect only offers
    // writable calendars to a "create"/duplicate draft (packet 08 step 8).
    // isBusy comes straight off the source event's real content, not the
    // draft's `values.title` (which stays "" for a busy source - see
    // editGridEventDraft) - "Busy" below is a display-only override, never
    // a value that could round-trip through a save.
    const isBusy =
      draft.kind === "edit" && draft.source.content.kind === "busy";
    const isReadOnly =
      draft.kind === "edit" &&
      isEventReadOnly(calendarLookup, draft.source.calendarId, isBusy);
    const displayTitle = isBusy ? BUSY_EVENT_TITLE : (title ?? "");
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

    // Only a "create" draft (new or duplicate) can target a calendar; an
    // "edit" draft's calendar is fixed (A6) and CalendarSelect isn't shown
    // for it.
    const onSelectCalendar = useCallback(
      (calendarId: CalendarId) => {
        setLatestDraft((current) => {
          if (!current || current.kind !== "create") return current;
          return { ...current, values: { ...current.values, calendarId } };
        });
      },
      [setLatestDraft],
    );

    // Schema_Event-shaped writer for the still-unconverted DatePickers/
    // PrioritySection field-patch API and RecurrenceSection's setEvent
    // contract: merges the patch onto the current draft's Schema_Event
    // projection, then reapplies it onto the canonical GridEventDraft.
    const setLatestEvent = useCallback(
      (nextEvent: SetStateAction<Schema_Event | null>) => {
        const currentEvent = gridEventDraftToSchemaEvent(
          latestDraftRef.current,
        );
        const resolvedEvent =
          typeof nextEvent === "function" ? nextEvent(currentEvent) : nextEvent;

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
      // Belt for the read-only gate above: the Save button doesn't render,
      // but Enter/Mod+Enter shortcuts below call this directly regardless
      // of what's on screen, so the block has to live here too (packet 08
      // step 8).
      if (isReadOnly) return;

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

        // Belt for the read-only gate: EventActionMenu already hides
        // Delete for a read-only draft, but the keyboard shortcut fires
        // regardless of what's rendered (packet 08 step 8).
        if (isReadOnly) {
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

    useEscapeToCloseForm(onClose);

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
                // w-full: an input's intrinsic size-attribute width would
                // overflow the sidebar-width form and force horizontal scroll
                "w-full bg-transparent font-semibold text-2xl transition-all duration-300",
              )}
              autoFocus
              disabled={isReadOnly}
              onChange={onChangeEventTextField("title")}
              onKeyDown={handleTitleKeyDown}
              placeholder="Title"
              name="Event Title"
              ref={titleInputRef}
              underlineColor={priorityColor}
              value={displayTitle}
              withUnderline
            />
          }
          actions={
            <EventActionMenu
              bgColor={darken(priorityColor)}
              isExistingEvent={isExistingEvent}
              isReadOnly={isReadOnly}
              onDuplicate={onDuplicateEvent}
              onDelete={onDeleteEvent}
            />
          }
        />

        {/* Same fieldset mechanism as the title above, covering priority/
            calendar/date/recurrence/description in one wrapper. */}
        <fieldset className="contents" disabled={isReadOnly}>
          <PrioritySection
            onSetEventField={onSetEventField}
            priority={priority}
          />

          {draft.kind === "create" ? (
            <CalendarSelect
              onChange={onSelectCalendar}
              value={draft.values.calendarId}
            />
          ) : (
            <p className="my-1.5 text-text-light text-xs">
              Calendar: {originalCalendarName}
            </p>
          )}

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
        </fieldset>

        {isReadOnly && (
          <p role="note" className="my-1.5 text-text-light text-xs">
            Read-only — you don't have permission to edit this event.
          </p>
        )}

        {!isReadOnly && (
          <SaveSection priority={priority} onSubmit={onSubmitForm} />
        )}
      </EventFormShell>
    );
  },
  fastDeepEqual,
);

EventForm.displayName = "EventForm";
