import type React from "react";
import { useEffect, useRef } from "react";
import dayjs from "@core/util/date/dayjs";
import { parseUserDate } from "@web/common/utils/datetime/web.date.util";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { DatePicker } from "@web/components/DatePicker/DatePicker";
import {
  EVENT_FORM_DATE_INPUT_FORMAT,
  formatEventFormDateLabel,
} from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/eventFormDateField.util";

const DATE_FIELD_CLASSNAME =
  "c-event-form-date-field flex min-w-0 flex-1 items-center [&_.react-datepicker-wrapper]:w-full [&_.react-datepicker\\_\\_input-container]:w-full [&_input]:w-full [&_input]:min-w-0";

const stopPropagation = (e: React.MouseEvent<HTMLDivElement>) => {
  e.stopPropagation();
};

export interface EventFormDateFieldProps {
  /** When true, bare ArrowDown opens the calendar instead of nudging +1 day. */
  arrowDownOpensCalendar?: boolean;
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
  arrowDownOpensCalendar = false,
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

  const commitTypedDate = (value: string) => {
    const parsed = parseUserDate(value, dayjs());
    if (!parsed) return false;
    onCommit(parsed.startOf("day").toDate());
    return true;
  };

  const revertInput = (target: HTMLInputElement) => {
    target.value = formatEventFormDateLabel(selectedRef.current);
  };

  /**
   * Enter, Tab, and blur all land here: commit a typed date that changes the
   * day, quietly restore an emptied field, and explain anything unparseable.
   * Returns false when nothing was committed.
   */
  const commitOrRevert = (target: HTMLInputElement) => {
    const value = target.value.trim();
    const parsed = value ? parseUserDate(value, dayjs()) : null;
    if (parsed && !parsed.isSame(selectedRef.current, "day")) {
      const date = parsed.startOf("day").toDate();
      // Optimistic until the parent re-renders, so a blur right after Enter
      // doesn't commit the same draft twice.
      selectedRef.current = date;
      onCommit(date);
      return true;
    }
    if (value && !parsed) {
      showErrorToast(
        `Sorry, IDK what to do with a ${sideLabel} date of '${value}'. Try 10.17.26, 17.10.26, 10/17/2026, or 2026-10-17.`,
      );
    }
    revertInput(target);
    return false;
  };

  const nudgeDays = (deltaDays: number) => {
    onCommit(dayjs(selectedRef.current).add(deltaDays, "day").toDate());
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    const typedValue = target.value;

    switch (true) {
      case event.key === "Backspace": {
        event.stopPropagation();
        break;
      }
      case event.key === "ArrowDown" && !isOpen: {
        if (event.shiftKey) {
          event.preventDefault();
          event.stopPropagation();
          nudgeDays(7);
          break;
        }
        if (arrowDownOpensCalendar && !event.metaKey && !event.ctrlKey) {
          if (!event.altKey) {
            event.preventDefault();
            event.stopPropagation();
            onCalendarOpen();
          }
          break;
        }
        event.preventDefault();
        event.stopPropagation();
        nudgeDays(1);
        break;
      }
      case event.key === "ArrowUp" && !isOpen: {
        event.preventDefault();
        event.stopPropagation();
        nudgeDays(event.shiftKey ? -7 : -1);
        break;
      }
      case event.key === "Enter" && (event.metaKey || event.ctrlKey): {
        commitTypedDate(typedValue);
        break;
      }
      case event.key === "Enter": {
        event.stopPropagation();
        event.preventDefault();
        if (!commitOrRevert(target)) onCalendarClose();
        break;
      }
      case event.key === "Escape": {
        if (isOpen) {
          onCalendarClose();
          event.stopPropagation();
          break;
        }
        revertInput(target);
        event.stopPropagation();
        break;
      }
      case event.key === "Tab": {
        if (!commitOrRevert(target)) onCalendarClose();
        break;
      }
    }
  };

  const jumpId = id ?? inputId;
  const resolvedInputId = id
    ? inputId
    : inputId
      ? `${inputId}-input`
      : undefined;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: stops date picker mouse events from bubbling to the form.
    <div
      ref={containerRef}
      className={DATE_FIELD_CLASSNAME}
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
    </div>
  );
};
