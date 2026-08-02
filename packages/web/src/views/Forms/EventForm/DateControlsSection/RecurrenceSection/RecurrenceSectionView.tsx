import { type Dispatch, type SetStateAction } from "react";
import dayjs from "@core/util/date/dayjs";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { EndsOnDate } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/components/EndsOnDate";
import { RecurrenceIntervalSelect } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/components/RecurrenceIntervalSelect";
import { RecurrenceToggle } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/components/RecurrenceToggle";
import { WeekDays } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/components/WeekDays";
import { useRecurrence } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/useRecurrence/useRecurrence";

export interface RecurrenceSectionProps {
  draft: GridEventDraft;
  setDraft: Dispatch<SetStateAction<GridEventDraft | null>>;
  seriesRules?: readonly string[];
}

// No auth/backend gate: anonymous (IndexedDB) mode stores the series record
// and expands occurrences at read time, and the signed-in backend-unavailable
// path falls back to that same local repository - recurrence works everywhere.
export function RecurrenceSection({
  draft,
  setDraft,
  seriesRules,
}: RecurrenceSectionProps) {
  const recurrenceHook = useRecurrence(draft, { setDraft }, seriesRules);
  const { setInterval, setFreq, setWeekDays, setUntil } = recurrenceHook;
  const { weekDays, interval, freq, until, toggleRecurrence } = recurrenceHook;
  const { hasRecurrence } = recurrenceHook;
  // Lower bound for the "Ends on" picker: the recurrence can't stop before the
  // event's own occurrence, so the floor is the event's *start* date. Anchoring
  // it to the *end* used to disable the event's own date whenever the event ran
  // past local midnight (e.g. 23:00-00:30, or anything ending at 00:00 the next
  // day): the end lands on the following calendar day, and react-datepicker
  // compares day cells by calendar day, so the start date - the date the user
  // sees and most naturally reaches for - rendered disabled. A bare
  // YYYY-MM-DD keeps the bound date-only for both event kinds.
  const recurrenceMinDate = dayjs(
    draft.values.schedule.start,
  ).toYearMonthDayString();

  return (
    <div className="flex w-full basis-full flex-col items-center gap-2 p-0">
      <RecurrenceToggle
        hasRecurrence={hasRecurrence}
        toggleRecurrence={toggleRecurrence}
      />

      {hasRecurrence && (
        <>
          <RecurrenceIntervalSelect
            initialValue={interval}
            frequency={freq}
            onChange={setInterval}
            onFreqSelect={setFreq}
            min={1}
            max={12}
          />

          <WeekDays value={weekDays} onChange={setWeekDays} />

          <EndsOnDate
            until={until}
            minDate={recurrenceMinDate}
            setUntil={setUntil}
          />
        </>
      )}
    </div>
  );
}
