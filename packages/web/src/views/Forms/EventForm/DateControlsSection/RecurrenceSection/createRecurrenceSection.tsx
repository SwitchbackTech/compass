import { type Dispatch, type SetStateAction } from "react";
import dayjs from "@core/util/date/dayjs";
import { type CompassSession } from "@web/auth/compass/session/session.types";
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

interface RecurrenceSectionDependencies {
  isBackendUnavailable: () => boolean;
  useSession: () => CompassSession;
}

export function createRecurrenceSection({
  isBackendUnavailable,
  useSession,
}: RecurrenceSectionDependencies) {
  return function RecurrenceSection({
    draft,
    setDraft,
    seriesRules,
  }: RecurrenceSectionProps) {
    const { authenticated } = useSession();
    const recurrenceHook = useRecurrence(draft, { setDraft }, seriesRules);
    const { setInterval, setFreq, setWeekDays, setUntil } = recurrenceHook;
    const { weekDays, interval, freq, until, toggleRecurrence } =
      recurrenceHook;
    const { hasRecurrence } = recurrenceHook;
    const isBackendDown = isBackendUnavailable();
    const isRecurrenceDisabled = !authenticated || isBackendDown;
    const disabledMessage = "Sign in to use recurring events.";
    const scheduleEndDate =
      draft.values.schedule.kind === "allDay"
        ? dayjs(draft.values.schedule.end).toYearMonthDayString()
        : dayjs(draft.values.schedule.end).format();

    return (
      <div className="flex w-full basis-full flex-col items-center gap-2 p-0">
        <RecurrenceToggle
          disabled={isRecurrenceDisabled}
          disabledMessage={disabledMessage}
          hasRecurrence={hasRecurrence}
          toggleRecurrence={toggleRecurrence}
        />

        {hasRecurrence && !isRecurrenceDisabled && (
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
              minDate={scheduleEndDate}
              setUntil={setUntil}
            />
          </>
        )}
      </div>
    );
  };
}
