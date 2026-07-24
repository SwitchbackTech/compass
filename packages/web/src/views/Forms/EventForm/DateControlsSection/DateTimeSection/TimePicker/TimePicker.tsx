import type React from "react";
import { useRef } from "react";
import ReactSelect, { type Props as RSProps } from "react-select";
import { type SelectOption } from "@web/common/types/component.types";
import { type TimeOption } from "@web/common/types/util.types";

export interface Props extends Omit<RSProps, "onChange" | "value"> {
  isMenuOpen: boolean;
  onChange: (option: SelectOption<string>) => void;
  options?: TimeOption[];
  selectClassName?: string;
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  value: SelectOption<string>;
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
  const TIMEPICKER = "timepicker";
  const containerRef = useRef<HTMLDivElement>(null);
  let scrollTimer: number;

  return (
    <div ref={containerRef} className="c-time-picker">
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
      />
    </div>
  );
};
