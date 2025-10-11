import React, { useMemo } from "react";
import ReactSelect from "react-select";
import { brighten, darken } from "@core/util/color.utils";
import { theme } from "@web/common/styles/theme";
import {
  FREQUENCY_MAP,
  FREQUENCY_OPTIONS,
  FrequencyValues,
} from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/constants/recurrence.constants";

export interface FreqSelectProps {
  bgColor: string;
  value: FrequencyValues;
  plural?: boolean;
  onFreqSelect: (option: FrequencyValues) => void;
}

export const FreqSelect = ({
  bgColor,
  value,
  plural = false,
  onFreqSelect,
}: FreqSelectProps) => {
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
      onChange={(option) =>
        option && option.value !== undefined && onFreqSelect(option.value)
      }
      theme={(selectTheme) => ({
        ...selectTheme,
        borderRadius: 4,
        primary: theme.color.border.primaryDark, // focus border color
        primary25: darken(bgColor), // hover color
        primary50: brighten(bgColor), // selected color
      })}
      styles={{
        control: (baseStyles, state) => ({
          ...baseStyles,
          backgroundColor: bgColor,
          borderRadius: theme.shape.borderRadius,
          border: "none",
          transition: theme.transition.default,
          fontSize,
          "&:hover": {
            filter: `brightness(95%)`,
          },
          boxShadow: state.isFocused
            ? `0 0 0 2px ${theme.color.border.primaryDark}`
            : "none",
        }),
        indicatorSeparator: () => ({
          visibility: "hidden",
        }),
        menu: (baseStyles) => ({
          ...baseStyles,
          overflow: "visible",
        }),
        menuList: (baseStyles) => ({
          ...baseStyles,
          fontSize,
          backgroundColor: bgColor,
          maxHeight: "none",
          overflowY: "visible",
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
        }),
      }}
    />
  );
};
