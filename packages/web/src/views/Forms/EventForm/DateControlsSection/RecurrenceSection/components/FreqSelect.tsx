import { useMemo } from "react";
import ReactSelect from "react-select";
import { colors } from "@web/common/styles/colors";
import { theme } from "@web/common/styles/theme";
import {
  FREQUENCY_MAP,
  FREQUENCY_OPTIONS,
  type FrequencyValues,
} from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/constants/recurrence.constants";

export interface FreqSelectProps {
  value: FrequencyValues;
  plural?: boolean;
  onFreqSelect: (option: FrequencyValues) => void;
}

export const FreqSelect = ({
  value,
  plural = false,
  onFreqSelect,
}: FreqSelectProps) => {
  const options = useMemo(() => FREQUENCY_OPTIONS(plural ? "s" : ""), [plural]);
  const fontSize = theme.text.size.m;

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
        primary: colors.borderStrong, // focus border color
      })}
      styles={{
        control: (baseStyles, state) => ({
          ...baseStyles,
          backgroundColor: "var(--color-surface-overlay)",
          borderRadius: theme.shape.borderRadius,
          border: "none",
          transition: theme.transition.default,
          fontSize,
          "&:hover": {
            backgroundColor: "hsl(0 0 100 / 12%)",
          },
          boxShadow: state.isFocused
            ? `0 0 0 2px ${colors.borderStrong}`
            : "none",
        }),
        singleValue: (baseStyles) => ({
          ...baseStyles,
          color: "var(--text)",
        }),
        // Matches CaretInput's stepper arrows, which inherit the ambient
        // text color - without this react-select's default neutral gray
        // caret visibly mismatches the sibling stepper.
        dropdownIndicator: (baseStyles) => ({
          ...baseStyles,
          color: "var(--text)",
          "&:hover": {
            color: "var(--text)",
          },
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
          backgroundColor: "var(--surface)",
          maxHeight: "none",
          overflowY: "visible",
        }),
        // Same recipe as .timepicker__option--is-selected/--is-focused
        // (index.css) - a translucent white overlay reads as a highlight on
        // both themes' surfaces rather than needing per-theme tuning.
        option: (styles, { isDisabled, isFocused, isSelected }) => ({
          ...styles,
          backgroundColor: isDisabled
            ? undefined
            : isSelected || isFocused
              ? "hsl(0 0 100 / 10%)"
              : "transparent",
          color: "var(--text)",
          opacity: isDisabled ? 0.5 : 1,
          cursor: isDisabled ? "not-allowed" : "default",
        }),
      }}
    />
  );
};
