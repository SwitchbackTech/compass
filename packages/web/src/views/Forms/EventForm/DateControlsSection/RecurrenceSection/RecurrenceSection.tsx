import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { hoverColorByPriority } from "@web/common/styles/theme.util";
import { FlexDirections } from "@web/components/Flex/styled";
import { StyledRepeatRow } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/styled";
import { useRecurrence } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/useRecurrence/useRecurrence";
import { EndsOnDate } from "./components/EndsOnDate";
import { RecurrenceIntervalSelect } from "./components/RecurrenceIntervalSelect";
import { RecurrenceToggle } from "./components/RecurrenceToggle";
import { WeekDays } from "./components/WeekDays";

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
  const recurrenceHook = useRecurrence(event, { setEvent });
  const { setInterval, setFreq, setWeekDays, setUntil } = recurrenceHook;
  const { weekDays, interval, freq, until, toggleRecurrence } = recurrenceHook;
  const { hasRecurrence } = recurrenceHook;
  const [showForm, setShowForm] = useState(() => hasRecurrence);

  useEffect(() => {
    setShowForm(hasRecurrence);
  }, [hasRecurrence, event?._id]);

  const shouldShowForm = hasRecurrence && showForm;

  return (
    <StyledRepeatRow direction={FlexDirections.COLUMN}>
      <RecurrenceToggle
        hasRecurrence={hasRecurrence}
        toggleRecurrence={toggleRecurrence}
        showForm={showForm}
        onToggleForm={() => setShowForm((value) => !value)}
      />

      {shouldShowForm && (
        <>
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
        </>
      )}
    </StyledRepeatRow>
  );
};
