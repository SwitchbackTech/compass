import type React from "react";
import { useEffect, useRef } from "react";
import dayjs from "@core/util/date/dayjs";
import { parseUserDate } from "@web/common/utils/datetime/web.date.util";
import { resolveFormControlJumpIds } from "@web/common/utils/form/form.util";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { DatePicker } from "@web/components/DatePicker/DatePicker";
import {
  EVENT_FORM_DATE_INPUT_FORMAT,
  formatEventFormDateLabel,
} from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/eventFormDateField.util";
import {
  EventFormCalendarPopoverHints,
  EventFormHintKeys,
  EventFormInfieldHint,
} from "@web/views/Forms/EventForm/EventFormFocusedHint";

const DATE_FIELD_CLASSNAME =
  "c-event-form-date-field flex min-w-0 flex-1 items-center [&_.react-datepicker-wrapper]:w-full [&_.react-datepicker\\_\\_input-container]:w-full [&_input]:w-full [&_input]:min-w-0";

const stopPropagation = (e: React.MouseEvent<HTMLDivElement>) => {
  e.stopPropagation();
};

/** Keys the field acts on itself never reach the form's own shortcuts. */
const consume = (event: React.KeyboardEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

export interface EventFormDateFieldProps {
  calendarClassName?: string;
  id?: string;
  inputId?: string;
  isOpen: boolean;
  onCalendarClose: () => void;
  onCalendarOpen: () => void;
  onCommit: (date: Date) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  selected: Date;
  sideLabel: "start" | "end";
  title: string;
}

export const EventFormDateField = ({
  calendarClassName,
  id,
  inputId,
  isOpen,
  onCalendarClose,
  onCalendarOpen,
  onCommit,
  onKeyDown,
  selected,
  sideLabel,
  title,
}: EventFormDateFieldProps) => {
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const containerRef = useRef<HTMLDivElement>(null);

  const shownDateRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) return;
    const input = containerRef.current?.querySelector("input");
    if (!input) return;
    // Closing the calendar (outside click, Escape) must not wipe a date the
    // user is still typing; blur commits or reverts it.
    const isDraft =
      input === document.activeElement &&
      shownDateRef.current === selected.getTime();
    if (isDraft) return;
    shownDateRef.current = selected.getTime();
    input.value = formatEventFormDateLabel(selected);
  }, [isOpen, selected]);

  const revertInput = (target: HTMLInputElement) => {
    target.value = formatEventFormDateLabel(selectedRef.current);
  };

  /**
   * Enter, Tab, and blur all land here: commit a typed date that changes the
   * day, quietly restore an emptied field, and explain anything unparseable.
   * The outcome tells Enter apart from the rest - a parseable date that is
   * already the committed one opens the calendar instead of committing.
   */
  const commitOrRevert = (
    target: HTMLInputElement,
  ): "committed" | "unchanged" | "rejected" => {
    const value = target.value.trim();
    const parsed = value ? parseUserDate(value, dayjs()) : null;
    if (parsed && !parsed.isSame(selectedRef.current, "day")) {
      const date = parsed.startOf("day").toDate();
      // Optimistic until the parent re-renders, so a blur right after Enter
      // doesn't commit the same draft twice.
      selectedRef.current = date;
      onCommit(date);
      return "committed";
    }
    if (value && !parsed) {
      showErrorToast(
        `Sorry, IDK what to do with a ${sideLabel} date of '${value}'. Try 10.17.26, 17.10.26, 10/17/2026, or 2026-10-17.`,
      );
    }
    revertInput(target);
    return parsed ? "unchanged" : "rejected";
  };

  const nudgeDays = (deltaDays: number) => {
    onCommit(dayjs(selectedRef.current).add(deltaDays, "day").toDate());
  };

  const isShowingCommittedDate = (input: HTMLInputElement) =>
    input.value === formatEventFormDateLabel(selectedRef.current);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (isOpen) {
      if (event.key === "Escape") {
        onCalendarClose();
        target.focus();
        event.stopPropagation();
      }
      // Other keys: react-datepicker handles arrows and Enter on the input
      // (onInputKeyDown runs our handler first, then its own).
      return;
    }

    switch (event.key) {
      case "Backspace": {
        event.stopPropagation();
        break;
      }
      case "ArrowDown": {
        consume(event);
        if (event.shiftKey) {
          nudgeDays(7);
          break;
        }
        // A modifier means the user wants the day nudge, not the calendar.
        if (event.metaKey || event.ctrlKey || event.altKey) {
          nudgeDays(1);
          break;
        }
        onCalendarOpen();
        break;
      }
      case "ArrowUp": {
        consume(event);
        nudgeDays(event.shiftKey ? -7 : -1);
        break;
      }
      case "Enter": {
        // Mod+Enter saves the form, so commit the draft and let it through.
        if (event.metaKey || event.ctrlKey) {
          const parsed = parseUserDate(target.value, dayjs());
          if (parsed) onCommit(parsed.startOf("day").toDate());
          break;
        }
        consume(event);
        // Enter on an unchanged, parseable date opens the calendar instead.
        if (commitOrRevert(target) === "unchanged") onCalendarOpen();
        break;
      }
      case " ": {
        if (!isShowingCommittedDate(target)) break;
        consume(event);
        onCalendarOpen();
        break;
      }
      case "Escape": {
        revertInput(target);
        event.stopPropagation();
        break;
      }
      case "Tab": {
        if (commitOrRevert(target) !== "committed") onCalendarClose();
        break;
      }
    }
  };

  const { jumpId, resolvedInputId } = resolveFormControlJumpIds(id, inputId);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: stops date picker mouse events from bubbling to the form.
    <div
      ref={containerRef}
      className={`${DATE_FIELD_CLASSNAME} group/control ${isOpen ? "" : "group-focus-within/control:[&_.c-event-form-date-field__input]:pr-8"}`}
      id={jumpId}
      onBlur={(event) => {
        // react-datepicker skips onBlur while its calendar is open, so listen
        // on the wrapper. Moving into the calendar is not leaving the field.
        const next = event.relatedTarget;
        if (next instanceof Element && next.closest(".react-datepicker"))
          return;
        if (event.target instanceof HTMLInputElement) {
          commitOrRevert(event.target);
        }
      }}
      onMouseDown={stopPropagation}
      onMouseUp={stopPropagation}
      tabIndex={-1}
    >
      <DatePicker
        calendarClassName={calendarClassName}
        captionPicker
        dateFormat={EVENT_FORM_DATE_INPUT_FORMAT}
        {...(resolvedInputId ? { inputId: resolvedInputId } : {})}
        inputClassName="c-event-form-date-field__input"
        isOpen={isOpen}
        monthTextClassName="text-medium"
        onCalendarClose={onCalendarClose}
        onCalendarOpen={onCalendarOpen}
        onChange={() => null}
        headerEndContent={
          isOpen ? <EventFormCalendarPopoverHints /> : undefined
        }
        onInputClick={onCalendarOpen}
        onFocus={(event) => {
          if (event.target instanceof HTMLInputElement) event.target.select();
        }}
        onKeyDown={handleKeyDown}
        onSelect={(date) => {
          if (!date) return;
          onCommit(date);
        }}
        preventOpenOnFocus
        selected={selected}
        title={title}
        view="grid"
        withUnderline={false}
      />
      <EventFormInfieldHint visible={!isOpen}>
        <EventFormHintKeys
          keys="ArrowDown"
          label="Arrow down opens the calendar"
        />
      </EventFormInfieldHint>
    </div>
  );
};
