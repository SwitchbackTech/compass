import type React from "react";
import { useEffect, useMemo, useRef } from "react";
import ReactSelect, {
  components,
  type SelectInstance,
  type SingleValueProps,
} from "react-select";
import { Frequency } from "rrule";
import { brighten, darken } from "@core/util/color.utils";
import { theme } from "@web/common/styles/theme";
import { RepeatIcon } from "@web/components/Icons/Repeat";
import { type FrequencyValues } from "../../../EventForm/DateControlsSection/RecurrenceSection/constants/recurrence.constants";

export type SomedayFrequencyOption = {
  label: string;
  value: FrequencyValues;
};

export const DO_NOT_REPEAT_OPTION: SomedayFrequencyOption = {
  label: "Does not repeat",
  value: Frequency.DAILY,
};

const SOMEDAY_FREQUENCY_OPTIONS: SomedayFrequencyOption[] = [
  DO_NOT_REPEAT_OPTION,
  { label: "Week", value: Frequency.WEEKLY },
  { label: "Month", value: Frequency.MONTHLY },
];

export const SomedayRecurrenceSelect = ({
  bgColor,
  hasRecurrence,
  freq,
  onSelect,
  menuIsOpen,
  onMenuClose,
  onCancel,
}: {
  bgColor: string;
  hasRecurrence: boolean;
  freq: FrequencyValues;
  onSelect: (option: SomedayFrequencyOption) => void;
  menuIsOpen?: boolean;
  onMenuClose?: () => void;
  onCancel?: () => void;
}) => {
  const fontSize = theme.text.size.m;
  const bgBright = brighten(bgColor);
  const bgDark = darken(bgColor);
  const selectedOption = useMemo<SomedayFrequencyOption>(
    () =>
      hasRecurrence
        ? (SOMEDAY_FREQUENCY_OPTIONS.find((option) => option.value === freq) ??
          SOMEDAY_FREQUENCY_OPTIONS[1])
        : DO_NOT_REPEAT_OPTION,
    [hasRecurrence, freq],
  );
  const selectRef = useRef<SelectInstance<SomedayFrequencyOption, false>>(null);

  useEffect(() => {
    if (menuIsOpen) {
      selectRef.current?.focus();
    }
  }, [menuIsOpen]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onCancel?.();
      return;
    }

    if (event.key !== "Enter") {
      return;
    }

    const selectInstance = selectRef.current as
      | (SelectInstance<SomedayFrequencyOption, false> & {
          state?: {
            menuIsOpen?: boolean;
            focusedOption?: SomedayFrequencyOption;
          };
        })
      | null;

    if (!selectInstance?.state?.menuIsOpen) {
      return;
    }

    const focusedOption = selectInstance.state.focusedOption;
    if (!focusedOption) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    selectInstance.selectOption(focusedOption);
  };

  const SingleValue = (
    props: SingleValueProps<SomedayFrequencyOption, false>,
  ) => {
    const isDoNotRepeat = props.data.value === DO_NOT_REPEAT_OPTION.value;

    return (
      <components.SingleValue {...props}>
        <span
          className="inline-flex items-center gap-1 text-m text-text-dark data-[dimmed=true]:text-text-dark-placeholder"
          data-testid="someday-recurrence-value"
          data-dimmed={isDoNotRepeat}
        >
          <RepeatIcon size={18} />
          <span>
            {isDoNotRepeat
              ? DO_NOT_REPEAT_OPTION.label
              : `Repeats every ${props.data.label.toLowerCase()}`}
          </span>
        </span>
      </components.SingleValue>
    );
  };

  return (
    <ReactSelect<SomedayFrequencyOption, false>
      options={SOMEDAY_FREQUENCY_OPTIONS}
      classNamePrefix="freq-select"
      value={selectedOption}
      onChange={(option) => onSelect(option ?? DO_NOT_REPEAT_OPTION)}
      isClearable={false}
      placeholder="Repeat"
      theme={(theme) => ({
        ...theme,
        borderRadius: 4,
      })}
      components={{
        SingleValue,
      }}
      styles={{
        control: (baseStyles, state) => ({
          ...baseStyles,
          backgroundColor: bgColor,
          borderRadius: theme.shape.borderRadius,
          fontSize,
          borderColor: state.isFocused
            ? "var(--compass-color-border-primary-dark)"
            : baseStyles.borderColor,
          boxShadow: state.isFocused
            ? "0 0 0 1px var(--compass-color-border-primary-dark)"
            : baseStyles.boxShadow,
        }),
        valueContainer: (baseStyles) => ({
          ...baseStyles,
          paddingLeft: "0.5rem",
        }),
        placeholder: (baseStyles) => ({
          ...baseStyles,
          color: "var(--compass-color-text-dark)",
        }),
        indicatorSeparator: () => ({
          visibility: "hidden",
        }),
        menuList: (baseStyles) => ({
          ...baseStyles,
          fontSize,
          backgroundColor: bgColor,
          overflowY: "hidden",
        }),
        option: (styles, { isDisabled, isFocused, isSelected }) => ({
          ...styles,
          backgroundColor: isDisabled
            ? undefined
            : isSelected
              ? bgBright
              : isFocused
                ? bgDark
                : undefined,
          color: isDisabled
            ? "var(--compass-color-text-light-inactive)"
            : "var(--compass-color-text-dark)",
          cursor: isDisabled ? "not-allowed" : "default",
          ":active": {
            ...styles[":active"],
            backgroundColor: !isDisabled
              ? isSelected
                ? bgColor
                : bgBright
              : undefined,
          },
        }),
      }}
      ref={selectRef}
      onKeyDown={handleKeyDown}
      menuIsOpen={menuIsOpen}
      onMenuClose={onMenuClose}
    />
  );
};
