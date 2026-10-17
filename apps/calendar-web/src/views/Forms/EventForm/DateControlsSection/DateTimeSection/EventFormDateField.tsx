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

  useEffect(() => {
    if (isOpen) return;
    const input = containerRef.current?.querySelector("input");
    if (!input) return;
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
        if (!commitTypedDate(typedValue)) {
          showErrorToast(
            `Sorry, IDK what to do with a ${sideLabel} date of '${typedValue}'. Try 10.17.26, 17.10.26, 10/17/2026, or 2026-10-17.`,
          );
        }
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
        onCalendarClose();
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
