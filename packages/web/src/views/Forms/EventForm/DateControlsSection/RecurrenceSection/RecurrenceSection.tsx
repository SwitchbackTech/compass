import React, { Dispatch, SetStateAction, useMemo, useState } from "react";
import ReactSelect from "react-select";
import { Frequency } from "rrule";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { brighten, darken } from "@core/util/color.utils";
import { parseCompassEventDate } from "@core/util/event/event.util";
import { theme } from "@web/common/styles/theme";
import { hoverColorByPriority } from "@web/common/styles/theme.util";
import { ConditionalRender } from "@web/components/ConditionalRender/conditional-render";
import { DatePicker } from "@web/components/DatePicker/DatePicker";
import { Flex } from "@web/components/Flex";
import { RepeatIcon } from "@web/components/Icons/Repeat";
import { StyledText } from "@web/components/Text/styled";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import {
  StyledCaretButton,
  StyledCaretInputContainer,
  StyledIntervalInput,
  StyledRepeatContainer,
  StyledRepeatRow,
  StyledRepeatText,
  StyledRepeatTextContainer,
  StyledWeekDay,
} from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/styled";
import {
  FREQUENCY_MAP,
  FREQUENCY_OPTIONS,
  WEEKDAYS,
  useRecurrence,
} from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/utils";

export interface RecurrenceSectionProps {
  bgColor: string;
  event: Schema_Event;
  setEvent: Dispatch<SetStateAction<Schema_Event | null>>;
}

const EditRecurrence = ({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) => {
  return (
    <StyledRepeatRow
      style={{ cursor: "pointer", marginBottom: 10 }}
      onClick={onClick}
    >
      <StyledText size="l" withBottomBorder>
        {open ? "Hide Event Recurrence" : "Edit Event Recurrence"}
      </StyledText>
    </StyledRepeatRow>
  );
};

const RecurrenceToggle = ({
  hasRecurrence,
  toggleRecurrence,
}: {
  hasRecurrence: boolean;
  toggleRecurrence: () => void;
}) => {
  return (
    <StyledRepeatRow>
      <ConditionalRender condition={!hasRecurrence}>
        <StyledRepeatContainer onClick={toggleRecurrence}>
          <StyledRepeatText hasRepeat={hasRecurrence} tabIndex={0}>
            Does not repeat
          </StyledRepeatText>
        </StyledRepeatContainer>
      </ConditionalRender>

      <ConditionalRender condition={hasRecurrence}>
        <StyledRepeatTextContainer onClick={toggleRecurrence}>
          <RepeatIcon />
          <StyledRepeatText hasRepeat={hasRecurrence}>
            Repeats every
          </StyledRepeatText>
        </StyledRepeatTextContainer>
      </ConditionalRender>
    </StyledRepeatRow>
  );
};

export const RecurrenceIntervalSelect = ({
  bgColor,
  initialValue,
  onChange,
  frequency,
  onFreqSelect,
  min,
  max,
}: {
  frequency: Frequency;
  onFreqSelect: (option: Frequency) => void;
  bgColor: string;
  initialValue: number;
  onChange: (repeatCount: number) => void;
  min: number;
  max: number;
}) => {
  const [value, setValue] = useState(initialValue);

  return (
    <StyledRepeatRow>
      <StyledText size="l">Every</StyledText>

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

      <FreqSelect
        bgColor={bgColor}
        value={frequency}
        plural={value > 1}
        onFreqSelect={onFreqSelect}
      />
    </StyledRepeatRow>
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
    <StyledRepeatRow>
      <StyledText size="l">On: </StyledText>

      {WEEKDAYS.map((day) => (
        <WeekDay
          key={day}
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
      ))}
    </StyledRepeatRow>
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

const EndsOnDate = ({
  until,
  bgColor,
  inputColor,
  setUntil,
  minDate = new Date().toISOString(),
}: {
  bgColor: string;
  inputColor: string;
  minDate?: string;
  until?: Date | null;
  setUntil: React.Dispatch<React.SetStateAction<Date | null>>;
}) => {
  const [open, setOpen] = useState(false);
  const miniDate = useMemo(() => parseCompassEventDate(minDate), [minDate]);

  return (
    <StyledRepeatRow>
      <StyledText size="l">Ends on:</StyledText>

      <Flex
        style={{
          cursor: "pointer",
          borderColor: theme.color.border.primaryDark,
          borderBottomWidth: 1,
          borderBottomStyle: "solid",
        }}
      >
        <TooltipWrapper
          description="Select recurrence end date"
          onClick={() => setOpen(true)}
        >
          <DatePicker
            bgColor={darken(bgColor, 15)}
            calendarClassName="recurrenceUntilDatePicker"
            inputColor={inputColor}
            isOpen={open}
            minDate={miniDate.toDate()}
            onCalendarClose={() => setOpen(false)}
            onChange={() => null}
            onSelect={(date) => setUntil(date)}
            selected={until}
            title="Select recurrence end date"
            view="grid"
          />
        </TooltipWrapper>
      </Flex>
    </StyledRepeatRow>
  );
};

const FreqSelect = ({
  bgColor,
  value = Frequency.DAILY,
  plural = false,
  onFreqSelect,
}: {
  bgColor: string;
  value: Exclude<
    Frequency,
    Frequency.HOURLY | Frequency.MINUTELY | Frequency.SECONDLY
  >;
  plural?: boolean;
  onFreqSelect: (option: Frequency) => void;
}) => {
  const options = useMemo(() => FREQUENCY_OPTIONS(plural ? "s" : ""), [plural]);
  const fontSize = theme.text.size.m;
  const bgBright = brighten(bgColor);
  const bgDark = darken(bgColor);

  const label = useMemo(
    () => `${FREQUENCY_MAP[value]}${plural ? "s" : ""}`,
    [value, plural],
  );

  return (
    <ReactSelect
      options={options}
      classNamePrefix="freq-select"
      value={{ label, value }}
      onChange={(e) => onFreqSelect(e?.value!)}
      maxMenuHeight={100}
      theme={(theme) => ({
        ...theme,
        borderRadius: 4,
      })}
      styles={{
        control: (baseStyles) => ({
          ...baseStyles,
          backgroundColor: bgColor,
          borderRadius: theme.shape.borderRadius,
          fontSize,
        }),
        indicatorSeparator: () => ({
          visibility: "hidden",
        }),
        menuList: (baseStyles) => ({
          ...baseStyles,
          fontSize,
          backgroundColor: bgColor,
        }),
        option: (styles, { isDisabled, isFocused, isSelected }) => {
          return {
            ...styles,
            backgroundColor: isDisabled
              ? undefined
              : isSelected
                ? bgBright
                : isFocused
                  ? bgDark
                  : undefined,
            color: isDisabled
              ? theme.color.text.lightInactive
              : theme.color.text.dark,
            cursor: isDisabled ? "not-allowed" : "default",

            ":active": {
              ...styles[":active"],
              backgroundColor: !isDisabled
                ? isSelected
                  ? bgColor
                  : bgBright
                : undefined,
            },
          };
        },
      }}
    />
  );
};

export const RecurrenceSection = ({
  bgColor,
  event,
  setEvent,
}: RecurrenceSectionProps) => {
  const recurrenceHook = useRecurrence(event, { setEvent });
  const { setInterval, setFreq, setWeekDays, setUntil } = recurrenceHook;
  const { weekDays, interval, freq, until, toggleRecurrence } = recurrenceHook;
  const { hasRecurrence } = recurrenceHook;
  const [showForm, setShowForm] = useState(false);

  return (
    <StyledRepeatRow
      style={{
        flexDirection: "column",
        alignItems: "flex-start",
        marginBottom: 10,
      }}
    >
      <ConditionalRender condition={hasRecurrence}>
        <EditRecurrence
          open={showForm}
          onClick={() => setShowForm((value) => !value)}
        />
      </ConditionalRender>

      <ConditionalRender condition={hasRecurrence ? showForm : true}>
        <RecurrenceToggle
          hasRecurrence={hasRecurrence}
          toggleRecurrence={toggleRecurrence}
        />
      </ConditionalRender>

      <ConditionalRender condition={hasRecurrence && showForm}>
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
