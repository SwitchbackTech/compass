import { useMemo, useRef } from "react";
import React from "react";
import ReactSelect, {
  PlaceholderProps,
  SelectInstance,
  SingleValueProps,
} from "react-select";
import { components } from "react-select";
import { Frequency } from "rrule";
import { useTheme } from "styled-components";
import { brighten, darken } from "@core/util/color.utils";
import { theme } from "@web/common/styles/theme";
import { RepeatIcon } from "@web/components/Icons/Repeat";
import { FrequencyValues } from "../../constants/recurrence.constants";
import { SelectContent } from "./styled";

export type SomedayFrequencyOption = {
  label: string;
  value: FrequencyValues;
};

const SOMEDAY_FREQUENCY_OPTIONS: SomedayFrequencyOption[] = [
  { label: "Week", value: Frequency.WEEKLY },
  { label: "Month", value: Frequency.MONTHLY },
];

export const SomedayRecurrenceSelect = ({
  bgColor,
  hasRecurrence,
  freq,
  onSelect,
}: {
  bgColor: string;
  hasRecurrence: boolean;
  freq: FrequencyValues;
  onSelect: (option: SomedayFrequencyOption | null) => void;
}) => {
  const fontSize = theme.text.size.m;
  const bgBright = brighten(bgColor);
  const bgDark = darken(bgColor);
  const selectedOption = useMemo<SomedayFrequencyOption | null>(
    () =>
      hasRecurrence
        ? (SOMEDAY_FREQUENCY_OPTIONS.find((option) => option.value === freq) ??
          SOMEDAY_FREQUENCY_OPTIONS[0])
        : null,
    [hasRecurrence, freq],
  );
  const selectTheme = useTheme();
  const selectRef = useRef<SelectInstance<SomedayFrequencyOption, false>>(null);

  const handleKeyDown = (event: React.KeyboardEvent) => {
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

  const Placeholder = (
    props: PlaceholderProps<SomedayFrequencyOption, false>,
  ) => (
    <components.Placeholder {...props}>
      <SelectContent
        dimmed
        data-dimmed
        data-testid="someday-recurrence-placeholder"
      >
        <RepeatIcon size={18} color={selectTheme.color.text.darkPlaceholder} />
        <span>Repeat</span>
      </SelectContent>
    </components.Placeholder>
  );

  const SingleValue = (
    props: SingleValueProps<SomedayFrequencyOption, false>,
  ) => (
    <components.SingleValue {...props}>
      <SelectContent data-testid="someday-recurrence-value">
        <RepeatIcon size={18} color={selectTheme.color.text.dark} />
        <span>Repeats every {props.data.label}</span>
      </SelectContent>
    </components.SingleValue>
  );

  return (
    <ReactSelect<SomedayFrequencyOption, false>
      options={SOMEDAY_FREQUENCY_OPTIONS}
      classNamePrefix="freq-select"
      value={selectedOption}
      onChange={(option) => onSelect(option ?? null)}
      isClearable
      maxMenuHeight={100}
      placeholder="Repeat"
      theme={(theme) => ({
        ...theme,
        borderRadius: 4,
      })}
      components={{
        Placeholder,
        SingleValue,
      }}
      styles={{
        control: (baseStyles, state) => ({
          ...baseStyles,
          backgroundColor: bgColor,
          borderRadius: theme.shape.borderRadius,
          fontSize,
          borderColor: state.isFocused
            ? selectTheme.color.border.primaryDark
            : baseStyles.borderColor,
          boxShadow: state.isFocused
            ? `0 0 0 1px ${selectTheme.color.border.primaryDark}`
            : baseStyles.boxShadow,
        }),
        valueContainer: (baseStyles) => ({
          ...baseStyles,
          paddingLeft: selectTheme.spacing.s,
        }),
        placeholder: (baseStyles) => ({
          ...baseStyles,
          color: selectTheme.color.text.lightInactive,
        }),
        indicatorSeparator: () => ({
          visibility: "hidden",
        }),
        menuList: (baseStyles) => ({
          ...baseStyles,
          fontSize,
          backgroundColor: bgColor,
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
            ? selectTheme.color.text.lightInactive
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
        }),
      }}
      ref={selectRef}
      onKeyDown={handleKeyDown}
    />
  );
};
