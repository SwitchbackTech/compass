import type React from "react";
import { useId, useRef } from "react";
import { type CSSObjectWithLabel, type Props as RSProps } from "react-select";
import CreatableSelect from "react-select/creatable";
import { type SelectOption } from "@web/common/types/component.types";
import { type TimeOption } from "@web/common/types/util.types";
import { parseUserTime } from "@web/common/utils/datetime/web.date.util";
import { useFloatingLayer } from "@web/shortcuts/floating-layer";

export interface Props extends Omit<RSProps, "onChange" | "value"> {
  isMenuOpen: boolean;
  onChange: (option: SelectOption<string>) => void;
  options?: TimeOption[];
  selectClassName?: string;
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  value: SelectOption<string>;
}

// react-select's default neutral80 is hsl(0,0%,20%) / #333. Class-based CSS
// in .c-time-picker loses to emotion style objects for these roles — same
// recipe as FreqSelect.
const themeColor =
  (cssVar: string) =>
  (base: CSSObjectWithLabel): CSSObjectWithLabel => ({
    ...base,
    color: cssVar,
  });

const timePickerTextStyles = {
  singleValue: themeColor("var(--text)"),
  input: themeColor("var(--text)"),
  option: themeColor("var(--text)"),
  placeholder: themeColor("var(--text-muted)"),
};

export const TimePicker = ({
  isMenuOpen,
  onChange: _onChange,
  options,
  selectClassName,
  setIsMenuOpen,
  value,
  ...props
}: Props) => {
  const TIMEPICKER = "timepicker";
  const containerRef = useRef<HTMLDivElement>(null);
  const layerId = useId();
  useFloatingLayer(`timePicker:${layerId}`, isMenuOpen);
  let scrollTimer: number;

  return (
    <div ref={containerRef} className="c-time-picker">
      <CreatableSelect
        {...props}
        className={selectClassName}
        classNamePrefix={TIMEPICKER}
        styles={timePickerTextStyles}
        value={value}
        maxMenuHeight={4 * 41}
        blurInputOnSelect
        menuIsOpen={isMenuOpen}
        //@ts-expect-error uses custom onChange to manage focus in parent
        onChange={_onChange}
        onKeyDown={(e) => {
          const key = e.key;

          if (key === "Enter" || key === "Backspace") {
            e.stopPropagation();
          }

          if (key === "Shift") {
            e.stopPropagation();
          }

          if (key === "Escape") {
            setIsMenuOpen(false);
            e.stopPropagation();
          }

          if (key === "Tab") {
            setIsMenuOpen(false);
          }
        }}
        onMenuOpen={() => {
          scrollTimer = window.setTimeout(() => {
            const defaultOpt = containerRef.current?.getElementsByClassName(
              `${TIMEPICKER}__option--is-selected`,
            )[0];
            if (defaultOpt) {
              defaultOpt.scrollIntoView();
            }
          }, 15);
          setIsMenuOpen(true);
        }}
        onMenuClose={() => {
          clearTimeout(scrollTimer);
          setIsMenuOpen(false);
        }}
        openMenuOnFocus={true}
        options={options}
        tabSelectsValue={false}
        isValidNewOption={(inputValue) => {
          const parsed = parseUserTime(inputValue, value?.value);
          if (!parsed) return false;
          // Don't show create row if the parsed time is already in options
          if (options?.some((o) => (o as TimeOption).value === parsed.value)) {
            return false;
          }
          return true;
        }}
        getNewOptionData={(inputValue) => {
          return parseUserTime(inputValue, value?.value) as TimeOption;
        }}
        formatCreateLabel={(inputValue) => {
          return parseUserTime(inputValue, value?.value)?.label ?? inputValue;
        }}
        createOptionPosition="first"
      />
    </div>
  );
};
