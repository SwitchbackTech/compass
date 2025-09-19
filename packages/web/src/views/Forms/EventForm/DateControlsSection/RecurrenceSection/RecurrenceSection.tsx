import React, { useCallback, useMemo, useState } from "react";
import ReactSelect from "react-select";
import { Frequency } from "rrule";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { Schema_Event } from "@core/types/event.types";
import { SelectOption } from "@web/common/types/component.types";
import { CalendarIcon } from "@web/components/Icons/Calendar";
import { StyledText } from "@web/components/Text/styled";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import {
  StyledCaretButton,
  StyledCaretInputContainer,
  StyledEditRecurrence,
  StyledEndsOnDate,
  StyledFreqSelect,
  StyledIntervalInput,
  StyledRecurrenceIntervalSelect,
  StyledRecurrenceSection,
  StyledWeekDay,
  StyledWeekDayContainer,
  StyledWeekDaysContainer,
} from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/styled";
import {
  FREQUENCY_MAP,
  FREQUENCY_OPTIONS,
  WEEKDAYS,
  useRecurrence,
} from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/utils";
import { RepeatIcon } from "../../../../../components/Icons/Repeat";
import {
  StyledRepeatContainer,
  StyledRepeatRow,
  StyledRepeatTextContainer,
} from "../../RepeatSection/styled";

export interface RecurrenceSectionProps {
  bgColor: string;
  event: Schema_Event;
  startTime: SelectOption<string>;
  endTime: SelectOption<string>;
  setEvent: (event: Schema_Event) => React.SetStateAction<Schema_Event>;
}

const EditRecurrence = ({ onClick }: { onClick: () => void }) => {
  return (
    <StyledEditRecurrence onClick={onClick}>
      <StyledText size="l" withBottomBorder>
        Edit Event Recurrence
      </StyledText>
    </StyledEditRecurrence>
  );
};

export const RecurrenceSection = ({
  bgColor,
  event,
}: RecurrenceSectionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const recurrenceHook = useRecurrence(event);
  const { options, setInterval, weekDays, setWeekDays } = recurrenceHook;
  const { setFreq, rrule } = recurrenceHook;
  const { interval } = options;

  const freq = useMemo(
    () => (event.recurrence?.rule ? options.freq! : "Never"),
    [event],
  );

  const [recurring, setRecurring] = useState<Frequency | "Never">(freq);
  const [recurrence, setRecurrence] = useState<string[] | null>(null);

  const toggleRecurrence = useCallback(
    () => setRecurrence((value) => (value ? null : rrule.toRecurrence())),
    [setRecurrence, rrule],
  );

  const onFreqSelect = useCallback(
    (option: Frequency | "Never") => {
      if (option !== "Never") setFreq(option);

      setRecurring(option);
    },
    [setRecurring, setFreq],
  );

  // const recurrence = useMemo(() => rrule.toRecurrence(), [options]);

  console.log("recurrence", isEditing);

  return (
    <>
      <StyledRepeatRow>
        <StyledRepeatContainer>
          <StyledRepeatTextContainer onClick={toggleRecurrence} tabIndex={0}>
            {recurrence ? <RepeatIcon /> : null}
            {recurrence ? "Repeats every" : "Does not repeat"}
          </StyledRepeatTextContainer>
        </StyledRepeatContainer>
      </StyledRepeatRow>

      {recurrence ? (
        <StyledRecurrenceSection>
          <RecurrenceIntervalSelect
            bgColor={bgColor}
            initialValue={interval!}
            recurring={recurring}
            onChange={setInterval}
            onFreqSelect={onFreqSelect}
            min={1}
            max={12}
          />

          {recurring !== "Never" ? (
            <>
              <WeekDays
                bgColor={bgColor}
                value={weekDays}
                onChange={setWeekDays}
              />

              {/* {weekDays.length > 0 && interval! > 1 && (
            <EndsOnDate />
          )} */}
            </>
          ) : null}

          {/* <StyledDisabledOverlay>
          <StyledUpcomingFeature>
            Recurring events coming soon!
          </StyledUpcomingFeature>
        </StyledDisabledOverlay> */}
        </StyledRecurrenceSection>
      ) : null}
    </>
  );
};

export const RecurrenceIntervalSelect = ({
  bgColor,
  initialValue,
  onChange,
  recurring,
  onFreqSelect,
  min,
  max,
}: {
  recurring: Frequency | "Never";
  onFreqSelect: (option: Frequency | "Never") => void;
  bgColor: string;
  initialValue: number;
  onChange: (repeatCount: number) => void;
  min: number;
  max: number;
}) => {
  const [value, setValue] = useState(initialValue);

  return (
    <StyledRecurrenceIntervalSelect>
      {recurring !== "Never" ? (
        <>
          <StyledText size="l">Repeat every</StyledText>

          <StyledIntervalInput
            bgColor={bgColor}
            type="number"
            max={12}
            min={1}
            value={value}
            readOnly
          />

          <CaretInput
            onChange={(type) => {
              if (type === "increase") {
                if (value < max) {
                  setValue(value + 1);
                  onChange(value + 1);
                }
              } else {
                if (value > min) {
                  setValue(value - 1);
                  onChange(value - 1);
                }
              }
            }}
          />
        </>
      ) : null}

      <FreqSelect
        value={recurring}
        plural={value > 1}
        onFreqSelect={onFreqSelect}
      />

      {recurring !== "Never" ? <StyledText size="l">on:</StyledText> : null}
    </StyledRecurrenceIntervalSelect>
  );
};

const CaretInput = ({
  onChange,
}: {
  onChange: (type: "increase" | "decrease") => void;
}) => {
  return (
    <StyledCaretInputContainer>
      <StyledCaretButton
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onChange("increase");
        }}
      >
        <CaretUp size={14} />
      </StyledCaretButton>
      <StyledCaretButton
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onChange("decrease");
        }}
      >
        <CaretDown size={14} />
      </StyledCaretButton>
    </StyledCaretInputContainer>
  );
};

const WeekDays = ({
  bgColor,
  value,
  onChange,
}: {
  bgColor: string;
  value: typeof WEEKDAYS;
  onChange: (days: typeof WEEKDAYS) => void;
}) => {
  return (
    <StyledWeekDaysContainer>
      {WEEKDAYS.map((day) => (
        <StyledWeekDayContainer key={day}>
          <WeekDay
            day={day}
            bgColor={bgColor}
            onClick={() => {
              if (value.includes(day)) {
                onChange(value.filter((d) => d !== day));
              } else {
                onChange([...value, day]);
              }
            }}
            selected={value.includes(day)}
          />
        </StyledWeekDayContainer>
      ))}
    </StyledWeekDaysContainer>
  );
};

const WeekDay = ({
  day,
  bgColor,
  onClick,
  selected,
}: {
  day: string;
  bgColor: string;
  onClick: () => void;
  selected: boolean;
}) => {
  return (
    <StyledWeekDay
      bgColor={bgColor}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      selected={selected}
    >
      {day.charAt(0).toUpperCase()}
    </StyledWeekDay>
  );
};

const EndsOnDate = () => {
  return (
    <>
      <StyledEndsOnDate>
        <StyledText size="l">
          Ends on: {/* Ends on {event.startDate.format("YYYY-MM-DD")} */}
        </StyledText>

        <TooltipWrapper
          description="Select event's end date"
          onClick={() => {}}
        >
          <CalendarIcon />
        </TooltipWrapper>
      </StyledEndsOnDate>
    </>
  );
};

const FreqSelect = ({
  value = "Never",
  plural = false,
  onFreqSelect,
}: {
  value: Frequency | "Never";
  plural?: boolean;
  onFreqSelect: (option: Frequency | "Never") => void;
}) => {
  const options = useMemo(() => FREQUENCY_OPTIONS(plural ? "s" : ""), [plural]);

  const label = useMemo(() => {
    if (value === "Never") return FREQUENCY_MAP[value];

    return `${FREQUENCY_MAP[value]}${plural ? "s" : ""}`;
  }, [value, plural]);

  return (
    <StyledFreqSelect>
      <ReactSelect
        options={options}
        classNamePrefix="freq-select"
        value={{ label, value }}
        onChange={(e) => onFreqSelect(e?.value!)}
        maxMenuHeight={4 * 41}
      />
    </StyledFreqSelect>
  );
};
