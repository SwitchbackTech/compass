import { type Dispatch, type SetStateAction } from "react";
import { Priorities } from "@core/constants/core.constants";
import { type Schema_Event } from "@core/types/event.types";
import { useSession } from "@web/auth/compass/session/useSession";
import { isBackendUnavailable } from "@web/common/apis/util/backend-unavailable-error.util";
import { hoverColorByPriority } from "@web/common/styles/theme.util";
import { ConditionalRender } from "@web/components/ConditionalRender/ConditionalRender";
import { FlexDirections } from "@web/components/Flex/styled";
import { EndsOnDate } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/components/EndsOnDate";
import { RecurrenceIntervalSelect } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/components/RecurrenceIntervalSelect";
import { RecurrenceToggle } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/components/RecurrenceToggle";
import { WeekDays } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/components/WeekDays";
import { StyledRepeatRow } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/styled";
import { useRecurrence } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/useRecurrence/useRecurrence";

export interface RecurrenceSectionProps {
  bgColor: string;
  event: Schema_Event;
  setEvent: Dispatch<SetStateAction<Schema_Event | null>>;
}

export const RecurrenceSection = ({
  bgColor,
  event,
  setEvent,
}: RecurrenceSectionProps) => {
  const { authenticated } = useSession();
  const recurrenceHook = useRecurrence(event, { setEvent });
  const { setInterval, setFreq, setWeekDays, setUntil } = recurrenceHook;
  const { weekDays, interval, freq, until, toggleRecurrence } = recurrenceHook;
  const { hasRecurrence } = recurrenceHook;
  const isBackendDown = isBackendUnavailable();
  const isRecurrenceDisabled = !authenticated || isBackendDown;
  const disabledMessage = isBackendDown
    ? "Start the Compass backend and MongoDB to use recurring events."
    : "Sign in to use recurring events.";

  return (
    <StyledRepeatRow direction={FlexDirections.COLUMN}>
      <RecurrenceToggle
        disabled={isRecurrenceDisabled}
        disabledMessage={disabledMessage}
        hasRecurrence={hasRecurrence}
        toggleRecurrence={toggleRecurrence}
      />

      <ConditionalRender condition={hasRecurrence && !isRecurrenceDisabled}>
        <RecurrenceIntervalSelect
          bgColor={bgColor}
          initialValue={interval}
          frequency={freq}
          onChange={setInterval}
          onFreqSelect={setFreq}
          min={1}
          max={12}
        />

        <WeekDays bgColor={bgColor} value={weekDays} onChange={setWeekDays} />

        <EndsOnDate
          bgColor={bgColor}
          inputColor={
            hoverColorByPriority[event.priority ?? Priorities.UNASSIGNED]
          }
          until={until}
          minDate={event.endDate}
          setUntil={setUntil}
        />
      </ConditionalRender>
    </StyledRepeatRow>
  );
};
