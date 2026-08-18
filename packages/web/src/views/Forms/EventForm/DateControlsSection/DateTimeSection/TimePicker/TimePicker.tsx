import type React from "react";
import { useEffect, useId, useRef } from "react";
import { type CSSObjectWithLabel, type Props as RSProps } from "react-select";
import CreatableSelect from "react-select/creatable";
import { type SelectOption } from "@web/common/types/component.types";
import { type TimeOption } from "@web/common/types/util.types";
import { parseUserTime } from "@web/common/utils/datetime/web.date.util";
import { useFloatingLayer } from "@web/shortcuts/floating-layer";
import { resolveTimePickerSelection } from "./resolveTimePickerSelection";

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

const TIMEPICKER = "timepicker";

function optionFromFocusedMenu(
  container: HTMLElement | null,
  options: TimeOption[] | undefined,
  currentValue: string | undefined,
): TimeOption | undefined {
  const focusedLabel = container
    ?.getElementsByClassName(`${TIMEPICKER}__option--is-focused`)[0]
    ?.textContent?.trim();
  if (!focusedLabel) return undefined;

  const listed = options?.find((option) => option.label === focusedLabel);
  if (listed) return listed;

  const created = parseUserTime(focusedLabel, currentValue);
  return created?.label === focusedLabel ? created : undefined;
}

export const TimePicker = ({
  isMenuOpen,
  onChange: _onChange,
  options,
  selectClassName,
  setIsMenuOpen,
  value,
  ...props
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const layerId = useId();
  useFloatingLayer(`timePicker:${layerId}`, isMenuOpen);

  const { value: selectValue, options: selectOptions } =
    resolveTimePickerSelection(value, options);

  const cancelScrollToSelected = () => {
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
  };

  /** Menu options mount after open; wait for paint instead of a magic delay. */
  const scheduleScrollToSelected = () => {
    cancelScrollToSelected();
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;
        const defaultOpt = containerRef.current?.getElementsByClassName(
          `${TIMEPICKER}__option--is-selected`,
        )[0];
        defaultOpt?.scrollIntoView();
      });
    });
  };

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="c-time-picker">
      <CreatableSelect
        {...props}
        className={selectClassName}
        classNamePrefix={TIMEPICKER}
        styles={timePickerTextStyles}
        value={selectValue}
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
            // Commit the focused option ourselves. react-select's
            // tabSelectsValue preventDefaults Tab and, with blurInputOnSelect,
            // leaves focus on the document instead of the next field.
            if (e.nativeEvent.isComposing) return;
            if (!e.shiftKey) {
              const option = optionFromFocusedMenu(
                containerRef.current,
                selectOptions,
                value?.value,
              );
              if (option) _onChange(option);
            }
            setIsMenuOpen(false);
          }
        }}
        onMenuOpen={() => {
          setIsMenuOpen(true);
          scheduleScrollToSelected();
        }}
        onMenuClose={() => {
          cancelScrollToSelected();
          setIsMenuOpen(false);
        }}
        openMenuOnFocus={true}
        options={selectOptions}
        tabSelectsValue={false}
        ariaLiveMessages={{
          guidance: ({
            context,
            isSearchable,
            isMulti,
            isInitialFocus,
            "aria-label": ariaLabel,
          }) => {
            switch (context) {
              case "menu":
                return "Use Up and Down to choose options, press Enter to select the currently focused option, press Escape to exit the menu, press Tab to select the option and exit the menu.";
              case "input":
                return isInitialFocus
                  ? `${ariaLabel || "Select"} is focused ${isSearchable ? ",type to refine list" : ""}, press Down to open the menu, ${isMulti ? " press left to focus selected values" : ""}`
                  : "";
              case "value":
                return "Use left and right to toggle between focused values, press Backspace to remove the currently focused value";
              default:
                return "";
            }
          },
        }}
        isValidNewOption={(inputValue) => {
          const parsed = parseUserTime(inputValue, value?.value);
          if (!parsed) return false;
          // Don't show create row if the parsed time is already in options
          if (
            selectOptions?.some((o) => (o as TimeOption).value === parsed.value)
          ) {
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
