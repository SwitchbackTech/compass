import React, { Dispatch, SetStateAction } from "react";
import { Priorities } from "@core/constants/core.constants";
import { hoverColorByPriority } from "@web/common/styles/theme.util";
import {
  Schema_GridEvent,
  Schema_WebEvent,
} from "@web/common/types/web.event.types";
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
  event: Schema_WebEvent | Schema_GridEvent;
  setEvent: Dispatch<SetStateAction<Schema_WebEvent | Schema_GridEvent | null>>;
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

  return (
    <StyledRepeatRow direction={FlexDirections.COLUMN}>
      <RecurrenceToggle
        hasRecurrence={hasRecurrence}
        toggleRecurrence={toggleRecurrence}
      />

      <ConditionalRender condition={hasRecurrence}>
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
