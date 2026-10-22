import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import classNames from "classnames";
import { useId } from "react";
import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId } from "@core/types/domain-primitives";
import { BookingCheckboxRow } from "@web/booking/BookingCheckboxRow";
import {
  type AccountGroup,
  accountKey,
  accountLabel,
} from "@web/calendars/calendar.util";

interface BookingBlockingAccountGroupProps {
  blockingCalendarIds: ReadonlySet<CalendarId>;
  expanded: boolean;
  group: AccountGroup;
  onToggleCalendar: (calendarId: CalendarId, checked: boolean) => void;
  onToggleExpanded: () => void;
}

export function BookingBlockingAccountGroup({
  blockingCalendarIds,
  expanded,
  group,
  onToggleCalendar,
  onToggleExpanded,
}: BookingBlockingAccountGroupProps) {
  const panelId = useId();
  const totalCount = group.calendars.length;
  const blockingCount = group.calendars.filter((calendar) =>
    blockingCalendarIds.has(calendar.id),
  ).length;
  const summary = `${blockingCount} of ${totalCount} blocking`;
  const heading = accountLabel(group);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <button
        aria-controls={expanded ? panelId : undefined}
        aria-expanded={expanded}
        aria-label={`${heading}, ${summary}`}
        className="c-focus-ring flex w-full min-w-0 items-center gap-1 rounded-xs py-0.5 text-left text-sm"
        onClick={onToggleExpanded}
        type="button"
      >
        <CaretDownIcon
          aria-hidden="true"
          className={classNames(
            "shrink-0 text-text-muted transition-transform",
            !expanded && "-rotate-90",
          )}
          size={12}
        />
        <span className="min-w-0 truncate text-text-muted" translate="no">
          {heading}
        </span>
        <span className="shrink-0 text-text-muted text-xs">{summary}</span>
      </button>
      {expanded ? (
        <div className="flex flex-col gap-1 pl-4" id={panelId}>
          {group.calendars.map((calendar) => (
            <BlockingCalendarRow
              blockingCalendarIds={blockingCalendarIds}
              calendar={calendar}
              key={calendar.id}
              onToggle={onToggleCalendar}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BlockingCalendarRow({
  blockingCalendarIds,
  calendar,
  onToggle,
}: {
  blockingCalendarIds: ReadonlySet<CalendarId>;
  calendar: Calendar;
  onToggle: (calendarId: CalendarId, checked: boolean) => void;
}) {
  return (
    <BookingCheckboxRow
      checked={blockingCalendarIds.has(calendar.id)}
      onChange={(checked) => onToggle(calendar.id, checked)}
    >
      {calendar.name}
    </BookingCheckboxRow>
  );
}

export const blockingAccountGroupKey = accountKey;
