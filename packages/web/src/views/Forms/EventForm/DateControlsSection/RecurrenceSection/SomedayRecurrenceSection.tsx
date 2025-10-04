import React, { Dispatch, SetStateAction, useMemo, useState } from "react";
import ReactSelect from "react-select";
import { Frequency } from "rrule";
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
  StyledRepeatContainer,
  StyledRepeatRow,
  StyledRepeatText,
  StyledRepeatTextContainer,
} from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/styled";
import {
  FREQUENCY_MAP,
  FrequencyValues,
  useRecurrence,
} from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/utils";

export interface SomedayRecurrenceSectionProps {
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
      {!hasRecurrence ? (
        <StyledRepeatContainer onClick={toggleRecurrence}>
          <StyledRepeatText hasRepeat={hasRecurrence} tabIndex={0}>
            Does not repeat
          </StyledRepeatText>
        </StyledRepeatContainer>
      ) : (
        <StyledRepeatTextContainer onClick={toggleRecurrence}>
          <RepeatIcon />
          <StyledRepeatText hasRepeat={hasRecurrence}>
            Repeats every
          </StyledRepeatText>
        </StyledRepeatTextContainer>
      )}
    </StyledRepeatRow>
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

// Someday frequency options - only Weekly and Monthly
const SOMEDAY_FREQUENCY_OPTIONS = [
  { label: "Week", value: Frequency.WEEKLY },
  { label: "Month", value: Frequency.MONTHLY },
];

const SomedayFreqSelect = ({
  bgColor,
  value = Frequency.WEEKLY,
  onFreqSelect,
}: {
  bgColor: string;
  value: FrequencyValues;
  onFreqSelect: (option: FrequencyValues) => void;
}) => {
  const fontSize = theme.text.size.m;
  const bgBright = brighten(bgColor);
  const bgDark = darken(bgColor);

  const label = useMemo(() => FREQUENCY_MAP[value], [value]);

  return (
    <ReactSelect
      options={SOMEDAY_FREQUENCY_OPTIONS}
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

export const SomedayRecurrenceSection = ({
  bgColor,
  event,
  setEvent,
}: SomedayRecurrenceSectionProps) => {
  const recurrenceHook = useRecurrence(event, { setEvent });
  const { setFreq, setUntil } = recurrenceHook;
  const { freq, until, toggleRecurrence } = recurrenceHook;
  const { hasRecurrence } = recurrenceHook;
  const [showForm, setShowForm] = useState(false);

  // Set default frequency to Weekly for someday events if it's Daily
  React.useEffect(() => {
    if (hasRecurrence && freq === Frequency.DAILY) {
      setFreq(Frequency.WEEKLY);
    }
  }, [hasRecurrence, freq, setFreq]);

  return (
    <StyledRepeatRow
      style={{
        flexDirection: "column",
        alignItems: "flex-start",
        marginBottom: 10,
      }}
    >
      {hasRecurrence && (
        <EditRecurrence
          open={showForm}
          onClick={() => setShowForm((value) => !value)}
        />
      )}

      {(!hasRecurrence || showForm) && (
        <RecurrenceToggle
          hasRecurrence={hasRecurrence}
          toggleRecurrence={toggleRecurrence}
        />
      )}

      {hasRecurrence && showForm && (
        <>
          <SomedayFreqSelect
            bgColor={bgColor}
            value={freq}
            onFreqSelect={setFreq}
          />

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
