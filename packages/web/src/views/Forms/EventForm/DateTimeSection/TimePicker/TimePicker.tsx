import React from "react";
import ReactSelect, { Props as RSProps } from "react-select";
import { Key } from "ts-key-enum";
import { SelectOption } from "@web/common/types/component.types";
import { Option_Time } from "@web/common/types/util.types";
import { StyledDivider, StyledTimePicker } from "./styled";

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
    <StyledTimePicker bgColor={bgColor}>
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

          if (key === Key.Enter || key === Key.Backspace) {
            console.log("stopping prop");
            e.stopPropagation();
          }

          if (key === Key.Shift) {
            e.stopPropagation();
          }

          if (key === Key.Escape) {
            setIsMenuOpen(false);
            e.stopPropagation();
          }

          if (key === Key.Tab) {
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
      {isMenuOpen && <StyledDivider width="calc(100% - 16px)" />}
    </StyledTimePicker>
  );
};
