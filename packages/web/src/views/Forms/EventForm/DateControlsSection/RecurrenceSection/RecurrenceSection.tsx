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
import { useRecurrence } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/useRecurrence/useRecurrence";
import {
  FREQUENCY_MAP,
  FREQUENCY_OPTIONS,
  FrequencyValues,
  WEEKDAYS,
} from "./constants/recurrence.constants";

export interface RecurrenceSectionProps {
  bgColor: string;
  event: Schema_Event;
  setEvent: Dispatch<SetStateAction<Schema_Event | null>>;
}

const RecurrenceToggle = ({
  hasRecurrence,
  toggleRecurrence,
  showForm,
  onToggleForm,
}: {
  hasRecurrence: boolean;
  toggleRecurrence: () => void;
  showForm: boolean;
  onToggleForm: () => void;
}) => {
  const handleClick = () => {
    if (!hasRecurrence) {
      toggleRecurrence();
      onToggleForm();
    } else {
      onToggleForm();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Prevent ENTER from closing the form when the repeat menu is open
    if (event.key === "Enter") {
      event.preventDefault();
      handleClick();
    } else if (event.key === " ") {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <StyledRepeatRow>
      {!hasRecurrence || showForm ? (
        <StyledRepeatContainer onClick={toggleRecurrence}>
          <StyledRepeatText
            hasRepeat={hasRecurrence}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleRecurrence();
              }
            }}
          >
            Does not repeat
          </StyledRepeatText>
        </StyledRepeatContainer>
      ) : (
        <StyledRepeatTextContainer
          aria-label="Edit recurrence"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
        >
          <RepeatIcon size={18} />
          <span>Repeat</span>
        </StyledRepeatTextContainer>
      )}
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
  frequency: FrequencyValues;
  onFreqSelect: (option: FrequencyValues) => void;
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
          <div id="portal">
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
              portalId="portal"
            />
          </div>
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
  value: FrequencyValues;
  plural?: boolean;
  onFreqSelect: (option: FrequencyValues) => void;
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

  const shouldShowForm = hasRecurrence && showForm;

  return (
    <StyledRepeatRow
      style={{
        flexDirection: "column",
        alignItems: "flex-start",
        marginBottom: 10,
      }}
    >
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
