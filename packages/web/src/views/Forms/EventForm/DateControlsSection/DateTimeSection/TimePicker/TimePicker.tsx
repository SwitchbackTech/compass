import type React from "react";
import ReactSelect, { type Props as RSProps } from "react-select";
import { darken } from "@web/common/styles/color.utils";
import { type CSSVariables } from "@web/common/styles/css.types";
import { type SelectOption } from "@web/common/types/component.types";
import { type Option_Time } from "@web/common/types/util.types";

export interface Props extends Omit<RSProps, "onChange" | "value"> {
  bgColor: string;
  isMenuOpen: boolean;
  onChange: (option: SelectOption<string>) => void;
  options?: Option_Time[];
  selectClassName?: string;
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  value: SelectOption<string>;
}

export const TimePicker = ({
  bgColor,
  isMenuOpen,
  onChange: _onChange,
  options,
  selectClassName,
  setIsMenuOpen,
  value,
  ...props
}: Props) => {
  const TIMEPICKER = "timepicker";
  let scrollTimer: number;

  return (
    <div
      className="c-time-picker"
      style={
        {
          "--time-picker-bg": bgColor,
          "--time-picker-scrollbar": darken(bgColor, 40),
          "--time-picker-scrollbar-hover": darken(bgColor, 80),
        } as CSSVariables
      }
    >
      <ReactSelect
        {...props}
        className={selectClassName}
        classNamePrefix={TIMEPICKER}
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
            const defaultOpt = document.getElementsByClassName(
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
        }}
        openMenuOnFocus={true}
        options={options}
        tabSelectsValue={false}
      />
    </div>
  );
};
