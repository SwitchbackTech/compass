import { type Dispatch, type SetStateAction } from "react";
import { type CompassEvent } from "@core/types/compass-event.contracts";
import { isBackendUnavailable as getIsBackendUnavailable } from "@web/api/util/backend-unavailable-error.util";
import { type CompassSession } from "@web/auth/compass/session/session.types";
import { useSession } from "@web/auth/compass/session/useSession";
import { EndsOnDate } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/components/EndsOnDate";
import { RecurrenceIntervalSelect } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/components/RecurrenceIntervalSelect";
import { RecurrenceToggle } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/components/RecurrenceToggle";
import { WeekDays } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/components/WeekDays";
import { useRecurrence } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/useRecurrence/useRecurrence";

export interface RecurrenceSectionProps {
  event: CompassEvent;
  setEvent: Dispatch<SetStateAction<CompassEvent | null>>;
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
    event,
    setEvent,
  }: RecurrenceSectionProps) {
    const { authenticated } = useSession();
    const recurrenceHook = useRecurrence(event, { setEvent });
    const { setInterval, setFreq, setWeekDays, setUntil } = recurrenceHook;
    const { weekDays, interval, freq, until, toggleRecurrence } =
      recurrenceHook;
    const { hasRecurrence } = recurrenceHook;
    const isBackendDown = isBackendUnavailable();
    const isRecurrenceDisabled = !authenticated || isBackendDown;
    const disabledMessage = "Sign in to use recurring events.";

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
              minDate={event.endDate}
              setUntil={setUntil}
            />
          </>
        )}
      </div>
    );
  };
}

export const RecurrenceSection = createRecurrenceSection({
  isBackendUnavailable: getIsBackendUnavailable,
  useSession,
});
