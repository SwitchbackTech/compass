import {
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
} from "@floating-ui/react";
import classNames from "classnames";
import { useRef, useState } from "react";
import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId } from "@core/types/domain-primitives";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { getDefaultTargetCalendar } from "@web/calendars/calendar.util";

interface CalendarSelectProps {
  value: CalendarId | null;
  onChange: (calendarId: CalendarId) => void;
}

// Only calendars the user can actually write to are offered as a create
// target - a reader/freeBusy-only calendar would silently fail to accept a
// new event.
const getWritableCalendars = (calendars: Calendar[]): Calendar[] =>
  calendars.filter(
    (calendar) => calendar.isActive && calendar.capabilities.canWrite,
  );

// Primary first (it's the default target), then alphabetical - mirrors
// PlannerCalendarList's sort so the same calendar lands in the same relative
// position across the sidebar list and this picker.
const sortWritableCalendars = (calendars: Calendar[]): Calendar[] =>
  [...calendars].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

const calendarOptionLabel = (calendar: Calendar): string =>
  calendar.isPrimary ? `${calendar.name} (primary)` : calendar.name;

/**
 * Labeled calendar picker for NEW/DUPLICATE event forms (writable calendars
 * only). Existing-event forms never render this - A6 forbids moving a saved
 * event between calendars, so the edit form shows read-only text instead
 * (see EventForm.tsx).
 *
 * Follows SelectView.tsx's floating-ui pattern (useFloating +
 * useListNavigation + useClick + useDismiss + useRole, roving tabindex, no
 * FloatingFocusManager) rather than a generalized SelectView, since that
 * component is view-switcher-specific and this field has its own writable-
 * filter/no-calendar-state concerns.
 */
export const CalendarSelect = ({ value, onChange }: CalendarSelectProps) => {
  const { data } = useCalendarsQuery();
  const writableCalendars = sortWritableCalendars(
    getWritableCalendars(data ?? []),
  );
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const listRef = useRef<Array<HTMLElement | null>>([]);

  const selectedCalendar =
    writableCalendars.find((calendar) => calendar.id === value) ?? null;
  // A fresh create-draft has no calendarId yet; showing/selecting the
  // eventual default target here (rather than a blank control) is purely a
  // display default - it doesn't write to the draft until the user actually
  // picks something. useSaveEventForm.ts/useDraftActions.ts fall back to the
  // same default target at submit time if the user never touches this.
  const defaultCalendar = getDefaultTargetCalendar(writableCalendars) ?? null;
  const displayedCalendar = selectedCalendar ?? defaultCalendar;
  const displayedIndex = displayedCalendar
    ? writableCalendars.findIndex(
        (calendar) => calendar.id === displayedCalendar.id,
      )
    : -1;

  const { refs, context } = useFloating({
    open: isOpen,
    onOpenChange: (open) => {
      setIsOpen(open);
      if (open) {
        setActiveIndex(displayedIndex >= 0 ? displayedIndex : 0);
      } else {
        setActiveIndex(null);
        listRef.current = [];
      }
    },
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "listbox" });
  const listNavigation = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
    loop: true,
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions(
    [click, dismiss, role, listNavigation],
  );

  const selectCalendar = (calendar: Calendar) => {
    onChange(calendar.id);
    setIsOpen(false);
  };

  if (writableCalendars.length === 0) {
    return (
      <p className="my-1.5 text-status-error text-xs">
        No writable calendar available
      </p>
    );
  }

  const dropdownId = "calendar-select-dropdown";
  const buttonLabel = displayedCalendar
    ? `Calendar: ${calendarOptionLabel(displayedCalendar)}`
    : "Calendar";

  return (
    <div className="relative my-1.5">
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? dropdownId : undefined}
        aria-label={buttonLabel}
        className="c-focus-ring flex w-full items-center gap-2 rounded-xs px-1.5 py-1 text-left text-text-lighter text-xs hover:bg-text-lighter/10"
        type="button"
      >
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{
            backgroundColor:
              displayedCalendar?.backgroundColor ?? "transparent",
          }}
        />
        <span className="min-w-0 flex-1 truncate">
          {displayedCalendar
            ? calendarOptionLabel(displayedCalendar)
            : "Select a calendar"}
        </span>
      </button>

      {isOpen && (
        <div
          ref={refs.setFloating}
          {...getFloatingProps({
            onKeyDown: (e) => {
              if (
                activeIndex !== null &&
                (e.key === "Enter" || e.key === " ")
              ) {
                e.preventDefault();
                const calendar = writableCalendars[activeIndex];
                if (calendar) {
                  selectCalendar(calendar);
                }
              }
            },
          })}
          id={dropdownId}
          aria-label="Calendar"
          className="absolute top-full left-0 z-50 mt-1 min-w-[200px] rounded border border-border-primary bg-bg-secondary py-1 shadow-lg"
          role="listbox"
        >
          {writableCalendars.map((calendar, index) => {
            const isSelected = calendar.id === displayedCalendar?.id;
            const isActive = activeIndex === index;

            return (
              <div
                key={calendar.id}
                ref={(node) => {
                  listRef.current[index] = node;
                }}
                {...getItemProps({
                  onClick: () => selectCalendar(calendar),
                  active: isActive,
                })}
                role="option"
                aria-selected={isSelected}
                tabIndex={isActive ? 0 : -1}
                className={classNames(
                  "flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors",
                  isSelected ? "text-accent-primary" : "text-text-light",
                  isActive ? "bg-text-lighter/10" : "hover:bg-text-lighter/10",
                )}
              >
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: calendar.backgroundColor }}
                />
                <span className="min-w-0 flex-1 truncate">
                  {calendarOptionLabel(calendar)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
